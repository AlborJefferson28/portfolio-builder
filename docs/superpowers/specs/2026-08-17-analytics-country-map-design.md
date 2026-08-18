# Fix de geo-lookup y mapa de países en Analytics

## Contexto

El panel "Países" de [`AnalyticsPage.jsx`](../../../src/pages/AnalyticsPage.jsx) (RPC `get_portfolio_geo`) siempre muestra "Sin datos todavía" porque `country` es `null` en el 100% de los eventos `view` de `portfolio_events`. Investigación de causa raíz:

- La Edge Function `track-event` hace el geo-lookup contra `https://ipapi.co/{ip}/json/` sin API key.
- Confirmado en producción: `ipapi.co` devuelve `429 RateLimited` en el 100% de las llamadas de prueba (endpoint gratuito agotado/bloqueado, no es un fallo intermitente).
- El código trata cualquier `!res.ok` como fallo silencioso (`{ country: null, city: null }`), sin loguear el error — por eso el problema pasó desapercibido.
- Los inserts en `portfolio_events` nunca fallan (siempre `204`); el problema es exclusivamente el geo-lookup, no el guardado ni el RPC ni el render de `AnalyticsPage`.

Aprovechando el fix, se agrega un mapa mundial choropleth (vistas por país) usando componentes de [mapcn.dev](https://www.mapcn.dev/) como base, adaptados al proyecto.

**Restricción relevante:** el proyecto no usa Tailwind CSS, shadcn/ui ni TypeScript (CSS plano en `global.css`, componentes `.jsx`). El registro oficial de mapcn (`map.tsx`) es TypeScript y depende de `cn()` (helper de shadcn) + clases Tailwind para sus subcomponentes decorativos (controles, popups). Se porta solo la lógica core (contexto de mapa, manejo de viewport, `MapGeoJSON` con hover feature-state) a `.jsx` plano, sin traer Tailwind/shadcn al proyecto.

## Alcance

- Edge Function `track-event`: cambiar proveedor de geo-IP de `ipapi.co` a `ipwho.is`, capturar también `country_code` (ISO alpha-2), loguear fallos de geo-lookup.
- Migración: agregar columna `country_code text` a `portfolio_events`.
- Nuevo RPC `get_portfolio_geo_map` (todos los países, sin límite de 10, incluye `country_code`).
- Dataset estático de países del mundo (GeoJSON) + tabla de mapeo ISO alpha-2 → alpha-3.
- Componentes `Map.jsx` / `MapGeoJSON.jsx` (port de mapcn, sin Tailwind) + `CountryChoroplethMap.jsx`.
- Integración en `AnalyticsPage.jsx`: mapa arriba de la lista de países existente.
- **Fuera de alcance:** backfill de eventos históricos (no hay IPs guardadas para recalcular), controles de mapa (zoom/geolocalización/fullscreen), markers/rutas/clusters de mapcn (no aplican a este caso de uso), soporte offline del basemap (sigue usando tiles CARTO gratuitos de mapcn, requiere red).

## Diseño

### 1. Edge Function `track-event` — fix de geo-lookup

En `lookupGeo(ip)`:
- Cambiar la URL a `https://ipwho.is/{ip}?fields=success,country,country_code`.
- Si `data.success === false` (formato de error de ipwho.is) o `!res.ok` o excepción/timeout → `{ country: null, country_code: null, city: null }` (mismo comportamiento best-effort de hoy, nunca bloquea el insert).
- Si éxito → `{ country: data.country, country_code: data.country_code, city: null }` (ipwho.is no tiene campo de ciudad en el fetch reducido por `fields=`; si se quiere ciudad más adelante, agregar `city` a `fields`).
- Agregar `console.error('geo lookup failed', ...)` en el catch/rama de fallo — hoy es un catch mudo, así los cortes de servicio del proveedor quedan visibles en `query_logs` en vez de descubrirse por auditoría manual.
- El resto de la función no cambia (sigue llamándose solo para `event_type === 'view'`, mismo razonamiento de cuota ya documentado en el código).

Insert en `portfolio_events` agrega `country_code` al payload.

### 2. Migración de base de datos

```sql
alter table public.portfolio_events add column country_code text;
```

Sin backfill: los 4 eventos existentes quedan con `country`/`country_code` en `null` (no hay IP guardada de esos eventos para recalcular).

### 3. RPC `get_portfolio_geo_map`

Mismo patrón de seguridad que el resto de RPCs de agregación (`security definer`, chequeo de dueño vía `auth.uid()`), pero sin el `limit 10` de `get_portfolio_geo` — el mapa necesita la distribución completa, no solo el top 10.

```sql
create or replace function public.get_portfolio_geo_map(p_portfolio_id uuid default null, p_days integer default null)
returns table(country_code text, country text, visits bigint)
language sql
security definer
set search_path to 'public'
as $$
  with owned as (
    select id from portfolios where user_id = auth.uid() and (p_portfolio_id is null or id = p_portfolio_id)
  )
  select country_code, coalesce(country, 'Desconocido') as country, count(*) as visits
  from portfolio_events
  where portfolio_id in (select id from owned)
  and event_type = 'view'
  and country_code is not null
  and (p_days is null or created_at >= now() - (p_days || ' days')::interval)
  group by 1, 2
  order by 3 desc;
$$;
```

`get_portfolio_geo` (la lista de texto, top 10, incluye "Desconocido") se mantiene sin cambios — sigue siendo la fuente de la lista debajo del mapa.

### 4. Dataset geográfico

- `src/data/worldCountries.geo.json`: dataset público `world.geo.json` (~256KB, 180 países), cada `feature.id` en ISO alpha-3 (ej. `"USA"`).
- `src/data/iso2to3.js`: objeto plano `{ US: 'USA', AR: 'ARG', ... }` (~250 entradas) para convertir el `country_code` alpha-2 que devuelve `ipwho.is`/guardamos en DB al alpha-3 que usa el GeoJSON.
- `CountryChoroplethMap` hace el join en cliente: por cada fila de `get_portfolio_geo_map`, busca `iso2to3[country_code]` y arma un `Map<alpha3, visits>` para pasarle a la expresión de color.

### 5. Componentes de mapa (port de mapcn, sin Tailwind)

**Dependencia nueva:** `maplibre-gl` (`lucide-react` ya está instalado, no hace falta agregarlo salvo que se use algún ícono).

**`src/components/analytics/Map.jsx`** — port de la porción core del `Map` de mapcn:
- Contexto de mapa (`useMap()`), inicialización de `maplibregl.Map`, cleanup en unmount.
- Detección de tema claro/oscuro (observa `data-theme`/clase en `<html>`, ya usado por `ThemeToggle` del proyecto) para elegir el estilo CARTO claro u oscuro.
- Viewport fijo mostrando el mundo completo (sin controles de zoom/geolocalización — fuera de alcance).
- Reemplaza clases Tailwind por clases `an-map-*` nuevas en `global.css`.

**`src/components/analytics/MapGeoJSON.jsx`** — port de `MapGeoJSON` de mapcn:
- Agrega source + layers `fill`/`line` desde un `FeatureCollection`.
- Mantiene el hover feature-state de mapcn (necesario para el tooltip).
- `fillPaint`/`linePaint` como props, igual que el original.

**`src/components/analytics/CountryChoroplethMap.jsx`** (nuevo, específico de este caso de uso):
- Props: `geoMap` (filas de `get_portfolio_geo_map`).
- Arma `fillPaint` con una expresión `interpolate`/`step` de MapLibre sobre `['get', 'visits']` (visitas inyectadas por feature vía `feature-state` o precomputadas en las properties del GeoJSON clonado), escala secuencial sobre `#D97757` (tenue → intenso). Países sin datos: sin relleno, solo contorno sutil (`line-color` tenue, tema-aware).
- Hover: usa el feature-state de `MapGeoJSON` para resaltar y mostrar un tooltip simple (`div` posicionado, no el `MarkerPopup` completo de mapcn) con `"{país}: {visitas} visitas"`.
- Si `geoMap` está vacío, el componente no renderiza nada (el padre decide el mensaje de estado vacío).

### 6. Integración en `AnalyticsPage.jsx`

- `fetchStats` (línea ~76-99) agrega `supabase.rpc('get_portfolio_geo_map', { p_portfolio_id: id || null, p_days: days })` al `Promise.all`, nuevo estado `geoMap`.
- Sección "Países" (línea 238-247): `<CountryChoroplethMap geoMap={geoMap} />` antes de la lista `<ul className="an-list">` existente, que no cambia.
- Si el RPC de `geoMap` falla, no se agrega al `anyError` general que bloquea toda la página — mismo patrón de "fallo puntual no bloquea el resto" ya usado en el resto de `AnalyticsPage`. La lista de texto (`get_portfolio_geo`) sigue funcionando aunque el mapa falle.

## Manejo de errores

- Geo-lookup: fallos de `ipwho.is` (timeout, rate limit futuro, IP privada en dev) nunca bloquean el insert del evento — mismo best-effort de hoy, ahora logueado.
- RPC `get_portfolio_geo_map`: si falla, el mapa simplemente no se renderiza; la lista de países sigue mostrando datos de `get_portfolio_geo` de forma independiente.
- Carga de `maplibre-gl`/WebGL: si el navegador no soporta WebGL o falla la inicialización, se captura el error dentro de `Map.jsx` y no se renderiza nada (try/catch alrededor de la creación del mapa) — el resto del dashboard sigue funcionando.
- Países en `geoMap` sin equivalente en `iso2to3`/`worldCountries.geo.json` (código no reconocido): se ignoran silenciosamente en el mapa, pero siguen apareciendo en la lista de texto de abajo (que no depende del join geográfico).

## Testing / verificación

No hay tests automatizados en el proyecto; verificación manual.

- `npm run build` pasa sin errores.
- Aplicar migración (`country_code`) y desplegar el RPC `get_portfolio_geo_map` en Supabase (vía MCP).
- Desplegar la Edge Function `track-event` actualizada; confirmar con `query_logs` que ya no hay respuestas de `ipapi.co`/`ipwho.is` con error, y que las próximas filas insertadas en `portfolio_events` tienen `country`/`country_code` no nulos (probando con una IP pública real, no `127.0.0.1`).
- Visitar `/p/<slug>` sin sesión desde una red con IP pública; confirmar en `portfolio_events` que el nuevo evento `view` trae `country_code` poblado.
- Entrar a `/analytics/<id>` como dueño: confirmar que el mapa se pinta con el país correspondiente resaltado y que el hover muestra el tooltip con el conteo correcto.
- Cambiar el selector de rango (7/30/90 días): confirmar que el mapa se refiltra junto con el resto de las métricas.
- Portfolio sin visitas: confirmar que el mapa no se renderiza (ni vacío ni roto) y que el resto de la página muestra el estado vacío normal.
- Alternar tema claro/oscuro: confirmar que el basemap del mapa cambia junto con el resto de la UI.
- Simular un RPC de geo fallido (ej. nombre de función incorrecto temporalmente) y confirmar que el resto de `AnalyticsPage` sigue funcionando sin el mapa.
