# Analytics de portfolio (captura de eventos + dashboard)

## Contexto

Hoy el único dato de analytics es un contador entero `portfolios.views`, incrementado una vez por sesión de navegador vía el RPC `increment_portfolio_views` desde `PublicPortfolioPage.jsx` (clave `pb-viewed-${id}` en `sessionStorage`). No existe ninguna tabla de eventos, ninguna vista agregada, ni ningún sistema de planes/premium en el código (`grep` de "premium|subscription|plan|tier" no arroja nada relevante).

El pedido es construir una capa de analytics real: captura de eventos (vistas, clics en proyectos, clics en contacto/CV, scroll depth, tiempo en página, referrer, geolocalización, dispositivo) y una página de dashboard por portfolio para visualizarlos. No se construye sistema de premium/planes en esta iteración — todas las métricas quedan disponibles para todos los usuarios.

Como parte del trabajo también se agrega una feature que no existía: subida de CV a Supabase Storage y botón de descarga en `ContactBlock`, porque es uno de los eventos a trackear (`cv_click`) y no había forma de generarlo.

## Alcance

- Tabla `portfolio_events` + políticas RLS.
- Edge Function `track-event` que recibe los eventos, hace geo-lookup server-side por IP, e inserta con service role.
- Util de cliente `trackEvent()` + integración en `PublicPortfolioPage`, `ProjectsGrid`, `ProjectsList`, `ContactBlock` (reemplaza la lógica actual de `increment_portfolio_views`/`pb-viewed-*`).
- Bucket de Storage `cvs` + subida de CV en `ContactForm` + botón de descarga en `ContactBlock`.
- RPCs de agregación (overview, tendencia diaria, funnel, top proyectos, referrers, geo, dispositivos).
- Página nueva `AnalyticsPage.jsx` en `/analytics/:id`, enlazada desde `DashboardPage`.
- **Fuera de alcance:** sistema de planes/premium, gating de features, facturación, migración de `portfolios.views` existente (se mantiene el campo tal cual, ya no se incrementa — el dashboard nuevo usa `portfolio_events` como fuente de verdad).

## Diseño

### 1. Tabla `portfolio_events`

```sql
create table public.portfolio_events (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  event_type text not null check (event_type in ('view','project_click','contact_click','cv_click','scroll_depth','session_end')),
  target_id text,
  target_label text,
  referrer text,
  referrer_domain text,
  country text,
  city text,
  device_type text check (device_type in ('mobile','tablet','desktop')),
  session_id text not null,
  value numeric,
  created_at timestamptz not null default now()
);

create index portfolio_events_portfolio_created_idx on public.portfolio_events (portfolio_id, created_at);
create index portfolio_events_portfolio_type_idx on public.portfolio_events (portfolio_id, event_type);

alter table public.portfolio_events enable row level security;

create policy "Owners can read their portfolio events"
  on public.portfolio_events for select
  using (
    exists (
      select 1 from public.portfolios
      where portfolios.id = portfolio_events.portfolio_id
      and portfolios.user_id = auth.uid()
    )
  );
```

No hay política de `insert`/`update`/`delete` para `anon`/`authenticated` — todo insert pasa por la Edge Function, que usa la service role key y bypassa RLS.

- `target_id`/`target_label`: id y título de un proyecto (`project_click`), o id/etiqueta de un link de contacto (`contact_click`). Denormalizado para no tener que parsear el jsonb `portfolios.sections` al armar el ranking de top proyectos.
- `value`: porcentaje de scroll (25/50/75/100) para `scroll_depth`, o segundos en página para `session_end`. `null` para el resto.
- `session_id`: uuid generado en cliente (`crypto.randomUUID()`), persistido en `sessionStorage` con clave `pb-session-${portfolio_id}`. Agrupa los eventos de una visita para calcular visitantes únicos y el funnel.

### 2. Edge Function `track-event`

Nueva función en `supabase/functions/track-event/index.ts`, desplegada sin verificación de JWT (`verify_jwt = false`, visitantes anónimos).

Request: `POST { portfolio_id, event_type, target_id?, target_label?, referrer?, session_id, value? }`.

Lógica:
1. Valida `event_type` contra el enum permitido; 400 si no coincide.
2. Consulta `portfolios` (con service role) por `id = portfolio_id and published = true`; si no existe, 404 sin insertar (evita registrar eventos de portfolios inexistentes o despublicados).
3. Extrae IP del header `x-forwarded-for` (primer valor de la lista).
4. Geo-lookup best-effort: llama a un servicio externo de IP-geo (ej. `ipapi.co/{ip}/json/`) con `AbortSignal.timeout(1500)`. Si falla o hace timeout, `country`/`city` quedan `null` — nunca bloquea ni falla el insert por esto.
5. Parsea `referrer_domain` desde `referrer` con `new URL(referrer).hostname` (try/catch, `null` si `referrer` viene vacío o no es una URL válida).
6. Inserta la fila en `portfolio_events` con el client de service role.
7. Responde `204` sin body. Errores de validación → `400`/`404` con `{ error }`.

CORS: `Access-Control-Allow-Origin: *` (la función es de solo-ingesta, sin datos sensibles de vuelta) con manejo de `OPTIONS` preflight.

### 3. Cliente — captura de eventos

**`src/lib/tracking.js`** (nuevo):
- `getOrCreateSessionId(portfolioId)`: lee/crea `pb-session-${portfolioId}` en `sessionStorage`.
- `getDeviceType()`: por `window.innerWidth` (`<640` móvil, `<1024` tablet, resto desktop).
- `trackEvent(portfolioId, eventType, extra = {})`: hace `fetch` (o `navigator.sendBeacon` cuando `eventType === 'session_end'`) al endpoint de la Edge Function con `{ portfolio_id: portfolioId, event_type: eventType, session_id: getOrCreateSessionId(portfolioId), referrer: document.referrer || null, ...extra }`. Fire-and-forget: no bloquea la UI, errores de red se ignoran (`.catch(() => {})`).

**`PublicPortfolioPage.jsx`**:
- Reemplaza el bloque actual de `increment_portfolio_views`/`sessionStorage.getItem('pb-viewed-...')` por: si `!isOwnerView`, dispara `trackEvent(id, 'view', { device_type: getDeviceType() })` una vez por sesión (misma guarda de sessionStorage, ahora bajo la clave de `getOrCreateSessionId`, que ya es idempotente por sesión — no hace falta una segunda clave "ya vi esto").
- Agrega un listener de scroll (throttle simple con una bandera de umbral ya disparado) que llama `trackEvent(id, 'scroll_depth', { value: threshold })` en 25/50/75/100%, una vez cada uno por sesión.
- Agrega un listener `visibilitychange`/`pagehide` que calcula segundos desde el mount y llama `trackEvent(id, 'session_end', { value: seconds })` vía `sendBeacon`.
- Todo el tracking se omite completamente si `isOwnerView` es `true` (comportamiento ya existente, se preserva).
- `portfolio.id` se pasa hacia abajo a los componentes de sección que necesitan disparar clics (via prop `onTrack` o similar, ver siguiente punto) para no acoplar cada componente hijo a Supabase directamente.

**`PortfolioRenderer.jsx` / `ProjectsGrid.jsx` / `ProjectsList.jsx` / `ContactBlock.jsx`**:
- `PortfolioRenderer` recibe una prop `onTrack(eventType, extra)` desde `PublicPortfolioPage` (closure sobre `portfolio.id` y el guard de `isOwnerView`) y la pasa a los sub-componentes de sección.
- `ProjectsGrid`/`ProjectsList`: al hacer clic en una card de proyecto, llama `onTrack('project_click', { target_id: item.id, target_label: item.title })` antes de la navegación/expansión existente (no cambia el comportamiento actual del clic, solo agrega el tracking).
- `ContactBlock`: cada link de `content.links` y el `mailto:` disparan `onTrack('contact_click', { target_id: l.id, target_label: l.label })`; el nuevo botón de CV dispara `onTrack('cv_click', { target_label: 'CV' })`.

### 4. CV — subida a Storage y descarga

**Storage:**
- Bucket `cvs`, público para lectura.
- Path: `{user_id}/{portfolio_id}.pdf` (un solo CV activo por portfolio; resubir sobrescribe).
- Políticas sobre `storage.objects` (bucket `cvs`):
  - `select`: público (`true`).
  - `insert`/`update`/`delete`: `auth.uid()::text = (storage.foldername(name))[1]`.

**`src/lib/cvUpload.js`** (nuevo, mismo patrón que el `imageUpload.js` existente):
- `uploadPortfolioCv(file, userId, portfolioId)`: valida `file.type === 'application/pdf'` y tamaño ≤ 10MB (si falla, `Error` con mensaje en español); sube a `cvs/{userId}/{portfolioId}.pdf` con `upsert: true`; devuelve la URL pública.
- `deletePortfolioCv(userId, portfolioId)`: `remove([...])` del path, best-effort (errores ignorados), usado por el botón "Quitar".

**`initialData.js`**: agrega `cvUrl: ''` al `content` de la sección `contact`.

**`ContactForm.jsx`**: nuevo campo "CV (PDF)" con input de archivo (`accept="application/pdf"`), estado `uploading`, mensaje de error inline igual que el patrón de `ImageUploadField`. Muestra nombre/link del CV actual + botón "Quitar" cuando `content.cvUrl` no está vacío. Reutiliza `useAuth()` para `user.id` y necesita `portfolioId` (ya disponible en el contexto del editor — verificar cómo `EditorPage` pasa `portfolioId` a los forms, seguir el mismo patrón que ya exista).

**`ContactBlock.jsx`**: si `content.cvUrl` existe, botón "Descargar CV" con atributo `download` (mismo origen de Supabase Storage, fuerza descarga real) que dispara `onTrack('cv_click', ...)` al clic, ubicado antes de los links de redes.

### 5. RPCs de agregación

Todas con `security definer` + chequeo interno de `auth.uid() = (select user_id from portfolios where id = portfolio_id)`, para no depender de que el caller ya haya filtrado — devuelven vacío/null si el caller no es el dueño.

- `get_portfolio_overview(portfolio_id uuid, days int)` → `{ total_views, unique_visitors, avg_seconds_on_page, contact_ctr }` (un solo `select` con agregados condicionales sobre `portfolio_events` filtrado por `created_at >= now() - days`).
- `get_portfolio_daily_trend(portfolio_id uuid, days int)` → filas `{ day date, views int }`, `group by date_trunc('day', created_at)` sobre `event_type = 'view'`.
- `get_portfolio_funnel(portfolio_id uuid, days int)` → filas `{ stage text, count int }` para `view`, `scroll_depth >= 50`, `project_click`, `contact_click or cv_click` (conteos de `session_id` distintos por etapa, no de filas).
- `get_portfolio_top_projects(portfolio_id uuid, days int)` → filas `{ target_label text, clicks int }`, `group by target_label` sobre `event_type = 'project_click'`, orden descendente, límite 10.
- `get_portfolio_referrers(portfolio_id uuid, days int)` → filas `{ referrer_domain text, visits int }` sobre `event_type = 'view'`, `referrer_domain` nulo agrupado como `'Directo'`.
- `get_portfolio_geo(portfolio_id uuid, days int)` → filas `{ country text, visits int }` sobre `event_type = 'view'`, `country` nulo agrupado como `'Desconocido'`.
- `get_portfolio_devices(portfolio_id uuid, days int)` → filas `{ device_type text, visits int }` sobre `event_type = 'view'`.

Todos con parámetro `days` (7/30/90) para el selector de rango de la UI; `days = null`/`0` = histórico completo.

### 6. `AnalyticsPage.jsx`

Ruta nueva `/analytics/:id`, protegida (`ProtectedRoute`), registrada en `App.jsx` junto a `/editor/:id`.

- Al montar: `select` de `portfolios` por `id` y `user_id = user.id` — si no hay resultado, `navigate('/dashboard', { replace: true })` (no es dueño o no existe).
- Mismo layout que `DashboardPage` (`AppSidebar`, `ThemeToggle`).
- Selector de rango (7/30/90 días), estado local, dispara refetch de todos los RPC al cambiar.
- Fila de `StatCard` (componente ya existente): Vistas totales, Visitantes únicos, Tiempo promedio, % clic a contacto.
- Gráfico de línea (`recharts`, ya es dependencia) con la tendencia diaria.
- Funnel: barras horizontales o lista con las 4 etapas y su conteo/porcentaje respecto a `view`.
- Tabla de top proyectos.
- Dos listas simples (barra de progreso + label) para referrers y países.
- Gráfico de dona (`recharts`) para dispositivos.
- Estado vacío: si `total_views === 0`, mostrar mensaje "Todavía no hay datos" en vez de gráficos vacíos.

**`DashboardPage.jsx`**: cada `dash-card` de un portfolio publicado gana un botón/ícono (`BarChart2` de lucide) junto a "Editar" que navega a `/analytics/${p.id}`.

## Manejo de errores

- Edge Function: fallos de geo-lookup nunca bloquean el insert (best-effort con timeout). Fallos de validación devuelven 400/404 sin insertar. Fallos de insert en DB devuelven 500; el cliente los ignora (`trackEvent` es fire-and-forget).
- Cliente: si `fetch`/`sendBeacon` falla (red, adblocker bloqueando el endpoint, etc.), no se muestra nada al visitante — el tracking es best-effort y nunca debe romper la experiencia del portfolio público.
- CV upload: mismo patrón que `imageUpload.js` — validación de tipo/tamaño antes de llamar a Storage, mensaje inline en español si falla.
- `AnalyticsPage`: si algún RPC falla, mostrar mensaje de error inline en esa sección puntual (no bloquear el resto del dashboard si, por ejemplo, `get_portfolio_geo` falla pero el resto funciona).

## Testing / verificación

No hay tests automatizados en el proyecto; verificación manual.

- `npm run build` pasa sin errores.
- Crear tabla, políticas, bucket `cvs` y RPCs en Supabase (vía MCP) antes de probar.
- Desplegar la Edge Function `track-event` y confirmar con `get_edge_function`/logs que responde 204 a un request de prueba.
- Visitar `/p/<slug>` sin sesión: confirmar que se registra `view` en `portfolio_events` (país puede quedar `null` en local/dev si la IP no es pública).
- Hacer scroll hasta el fondo: confirmar eventos `scroll_depth` en 25/50/75/100.
- Clic en un proyecto y en un link de contacto: confirmar `project_click`/`contact_click` con `target_label` correcto.
- Subir un CV desde `ContactForm` en el editor, guardar, ver el botón "Descargar CV" en la página pública, hacer clic y confirmar que descarga el PDF real (no solo lo abre) y que se registra `cv_click`.
- Visitar el portfolio como dueño (sesión iniciada, `user.id === portfolio.user_id`): confirmar que NO se registra ningún evento.
- Cerrar/cambiar de pestaña tras visitar: confirmar `session_end` con `value` (segundos) razonable.
- Entrar a `/analytics/<id>` como dueño: ver las métricas reflejando los eventos generados en las pruebas anteriores, cambiar el selector de rango y confirmar que los datos se refiltran.
- Intentar entrar a `/analytics/<id>` de un portfolio ajeno: confirmar redirect a `/dashboard`.
- Portfolio recién creado sin eventos: confirmar el estado vacío en `AnalyticsPage` en vez de gráficos rotos/vacíos.
