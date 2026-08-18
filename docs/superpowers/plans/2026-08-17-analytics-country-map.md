# Fix de geo-lookup y mapa de países en Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arreglar la captura de país por IP en `portfolio_events` (rota por `ipapi.co` rate-limited) y agregar un mapa mundial choropleth de visitas por país en `AnalyticsPage`, usando una versión adaptada (sin Tailwind/TS) de los componentes `Map`/`MapGeoJSON` de mapcn.dev.

**Architecture:** Backend: la Edge Function `track-event` cambia de proveedor de geo-IP (`ipapi.co` → `ipwho.is`) y empieza a guardar `country_code` (ISO alpha-2) además de `country`; un nuevo RPC `get_portfolio_geo_map` expone todos los países con datos (sin el límite de 10 del RPC de lista). Frontend: `Map.jsx`/`MapGeoJSON.jsx` son un port a JSX plano (sin Tailwind/TS/shadcn) de la lógica core de mapcn sobre `maplibre-gl`; `CountryChoroplethMap.jsx` los usa para pintar un GeoJSON mundial (bundleado, ISO alpha-3) coloreado según visitas, uniendo por un mapeo estático alpha-2→alpha-3.

**Tech Stack:** React 18 + Vite, Supabase (Postgres + Edge Functions Deno), `maplibre-gl` (nueva dependencia), CSS plano en `global.css`.

## Global Constraints

- Proyecto sin tests automatizados — toda verificación es manual (build, `curl`, SQL, navegador). No introducir un framework de testing nuevo.
- `src/` es JavaScript/JSX puro — no agregar TypeScript.
- El proyecto NO usa Tailwind CSS ni shadcn/ui — todo estilo va como CSS plano en `src/styles/global.css`, siguiendo la convención de clases existente (`an-*` para Analytics, `adm-*` para admin).
- Proyecto Supabase: `project_id = dzannfaklwjhmkoauokq` (nombre `portfolio-builder`).
- Color de acento del proyecto: `#D97757`.
- El tema claro/oscuro del admin se controla con `document.documentElement.setAttribute('data-admin-theme', theme)` (ver `src/context/ThemeContext.jsx`), consumido vía el hook `useTheme()` (`{ theme, toggleTheme }`, `theme` es `'light'` o `'dark'`). No usar detección de tema por `data-theme`/clase `dark` en `<html>` (eso es lo que usa mapcn.dev por defecto, pero no aplica a este proyecto).
- Todos los RPCs de agregación siguen el mismo patrón de seguridad: `security definer`, `set search_path to 'public'`, y filtran por `auth.uid() = (select user_id from portfolios where id = ...)` vía una CTE `owned`. `get_portfolio_geo_map` debe seguir ese mismo patrón.
- Los edits en la Edge Function `track-event` se hacen redeployando el archivo completo vía la tool `deploy_edge_function` de Supabase MCP (no hay carpeta `supabase/functions` local en este repo) — `verify_jwt` debe seguir en `false`.

---

### Task 1: Migración DB — columna `country_code`

**Files:**
- Ninguno local — se aplica directo en el proyecto Supabase vía la tool MCP `apply_migration` (`project_id: dzannfaklwjhmkoauokq`).

**Interfaces:**
- Produces: columna `portfolio_events.country_code` (`text`, nullable), consumida por el insert de la Edge Function (Task 3) y por el RPC `get_portfolio_geo_map` (Task 2).

- [ ] **Step 1: Aplicar la migración**

Usar la tool `mcp__0d067d0e-3cab-4126-9d5f-306d6b305fba__apply_migration` con `project_id: "dzannfaklwjhmkoauokq"`, `name: "add_portfolio_events_country_code"`, y `query`:

```sql
alter table public.portfolio_events add column country_code text;
```

- [ ] **Step 2: Verificar la columna**

Ejecutar con `mcp__0d067d0e-3cab-4126-9d5f-306d6b305fba__execute_sql` (`project_id: "dzannfaklwjhmkoauokq"`):

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'portfolio_events' and column_name = 'country_code';
```

Esperado: una fila `{ column_name: 'country_code', data_type: 'text', is_nullable: 'YES' }`.

- [ ] **Step 3: Commit**

No hay archivos locales que commitear en este task (el cambio vive solo en Supabase). Continuar al Task 2.

---

### Task 2: RPC `get_portfolio_geo_map`

**Files:**
- Ninguno local — se aplica vía `apply_migration` (Supabase MCP).

**Interfaces:**
- Consumes: `portfolio_events.country_code` (Task 1).
- Produces: función `get_portfolio_geo_map(p_portfolio_id uuid, p_days integer) returns table(country_code text, country text, visits bigint)`, consumida desde el frontend (Task 5) vía `supabase.rpc('get_portfolio_geo_map', { p_portfolio_id, p_days })`.

- [ ] **Step 1: Aplicar la migración del RPC**

Usar `apply_migration` (`project_id: "dzannfaklwjhmkoauokq"`, `name: "add_get_portfolio_geo_map_rpc"`):

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

- [ ] **Step 2: Verificar que el RPC existe y no rompe**

Ejecutar con `execute_sql`:

```sql
select * from public.get_portfolio_geo_map(null, null);
```

Esperado: la query corre sin error. Devuelve 0 filas (normal — `execute_sql` no tiene `auth.uid()` de sesión, así que la CTE `owned` queda vacía; esto solo confirma que la función compila y ejecuta bien, no prueba los datos).

```sql
select proname, prosecdef from pg_proc where proname = 'get_portfolio_geo_map';
```

Esperado: una fila `{ proname: 'get_portfolio_geo_map', prosecdef: true }`.

- [ ] **Step 3: Commit**

No hay archivos locales. Continuar al Task 3.

---

### Task 3: Edge Function `track-event` — fix de geo-lookup

**Files:**
- Ninguno local — se despliega el archivo completo vía `mcp__0d067d0e-3cab-4126-9d5f-306d6b305fba__deploy_edge_function` (`project_id: "dzannfaklwjhmkoauokq"`, `name: "track-event"`).

**Interfaces:**
- Consumes: `portfolio_events.country_code` (Task 1).
- Produces: eventos `view` insertados en `portfolio_events` con `country`/`country_code` poblados cuando el geo-lookup tiene éxito.

**Contexto para quien ejecute este task:** la función actual llama a `https://ipapi.co/{ip}/json/` para geolocalizar por IP, pero ese endpoint gratuito está devolviendo `429 RateLimited` en el 100% de las pruebas — por eso `country` siempre queda `null`. El fix cambia el proveedor a `https://ipwho.is` (gratis, HTTPS, sin API key, confirmado funcionando) y agrega el campo `country_code` (ISO alpha-2) al insert. También se agrega logging de errores del geo-lookup (hoy es un catch mudo).

- [ ] **Step 1: Desplegar la función actualizada**

Usar `deploy_edge_function` con `project_id: "dzannfaklwjhmkoauokq"`, `name: "track-event"`, `entrypoint_path: "index.ts"`, `verify_jwt: false`, y este archivo completo:

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

const EVENT_TYPES = new Set([
  'view', 'project_click', 'contact_click', 'cv_click', 'scroll_depth', 'session_end',
]);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_TEXT_LENGTH = 300;
const MAX_ABS_VALUE = 100000;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') as string,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string,
);

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function truncate(text: string | null | undefined) {
  if (typeof text !== 'string') return null;
  return text.slice(0, MAX_TEXT_LENGTH);
}

function clampValue(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(-MAX_ABS_VALUE, Math.min(MAX_ABS_VALUE, value));
}

function parseReferrerDomain(referrer: string | null | undefined) {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

async function lookupGeo(ip: string | null) {
  if (!ip || ip === '127.0.0.1') return { country: null, country_code: null, city: null };
  try {
    const res = await fetch(`https://ipwho.is/${ip}?fields=success,message,country,country_code`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) {
      console.error('geo lookup failed: HTTP', res.status);
      return { country: null, country_code: null, city: null };
    }
    const data = await res.json();
    if (!data.success) {
      console.error('geo lookup failed:', data.message || 'unknown reason');
      return { country: null, country_code: null, city: null };
    }
    return { country: data.country || null, country_code: data.country_code || null, city: null };
  } catch (err) {
    console.error('geo lookup error:', err);
    return { country: null, country_code: null, city: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const {
    portfolio_id, event_type, target_id, target_label, referrer, session_id, value, device_type,
  } = body as Record<string, string | number | undefined>;

  if (!portfolio_id || !session_id || typeof event_type !== 'string' || !EVENT_TYPES.has(event_type)) {
    return jsonResponse({ error: 'Invalid payload' }, 400);
  }

  const { data: portfolio, error: portfolioError } = await supabase
    .from('portfolios')
    .select('id')
    .eq('id', portfolio_id)
    .eq('published', true)
    .single();

  if (portfolioError || !portfolio) {
    return jsonResponse({ error: 'Portfolio not found' }, 404);
  }

  // El geo-lookup solo se usa para agregar el panel de países sobre vistas
  // (get_portfolio_geo/get_portfolio_geo_map filtran event_type='view'), pero
  // cada visita también dispara varios scroll_depth/clicks/session_end — sin
  // este filtro se llamaría a ipwho.is varias veces por visita, agotando la
  // cuota gratuita mucho antes de tiempo y agregando latencia innecesaria a
  // esos inserts.
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : null;
  const { country, country_code, city } = event_type === 'view'
    ? await lookupGeo(ip)
    : { country: null, country_code: null, city: null };

  const { error: insertError } = await supabase.from('portfolio_events').insert({
    portfolio_id,
    event_type,
    target_id: truncate(target_id as string | undefined),
    target_label: truncate(target_label as string | undefined),
    referrer: truncate(referrer as string | undefined),
    referrer_domain: parseReferrerDomain(referrer as string | undefined),
    country,
    country_code,
    city,
    device_type: device_type || null,
    session_id: truncate(session_id as string) || session_id,
    value: clampValue(value),
  });

  if (insertError) {
    return jsonResponse({ error: 'Insert failed' }, 500);
  }

  return new Response(null, { status: 204, headers: CORS_HEADERS });
});
```

- [ ] **Step 2: Confirmar el despliegue**

Con `mcp__0d067d0e-3cab-4126-9d5f-306d6b305fba__get_edge_function` (`project_id: "dzannfaklwjhmkoauokq"`, `function_slug: "track-event"`), confirmar `status: "ACTIVE"` y que `files[0].content` contiene `"ipwho.is"`.

- [ ] **Step 3: Probar con una IP pública real**

Buscar un portfolio publicado real para usar en la prueba:

```sql
select id from public.portfolios where published = true limit 1;
```

Si no hay ninguno, crear uno de prueba no es necesario — usar el `id` que devuelva la query. Si la tabla está vacía, anotar este resultado y saltar a Step 5 (no bloquea el resto del plan, pero dejar constancia en el resumen final).

Con el `id` obtenido (`<PORTFOLIO_ID>`), ejecutar (reemplazando el placeholder):

```bash
curl -s -X POST "https://dzannfaklwjhmkoauokq.supabase.co/functions/v1/track-event" \
  -H "Content-Type: application/json" \
  -H "x-forwarded-for: 8.8.8.8" \
  -d '{"portfolio_id":"<PORTFOLIO_ID>","event_type":"view","session_id":"plan-verification-test","device_type":"desktop"}' \
  -w "\nHTTP_CODE:%{http_code}\n"
```

Esperado: `HTTP_CODE:204` (sin body).

- [ ] **Step 4: Confirmar el país en la fila insertada**

```sql
select country, country_code from public.portfolio_events
where session_id = 'plan-verification-test'
order by created_at desc limit 1;
```

Esperado: `{ country: 'United States', country_code: 'US' }` (8.8.8.8 es un DNS público de Google en EE.UU.).

- [ ] **Step 5: Limpiar la fila de prueba**

```sql
delete from public.portfolio_events where session_id = 'plan-verification-test';
```

- [ ] **Step 6: Commit**

No hay archivos locales que commitear (la función vive solo en Supabase). Continuar al Task 4.

---

### Task 4: Dataset geográfico (`worldCountries.geo.json` + `iso2to3.js`)

**Files:**
- Create: `src/data/worldCountries.geo.json`
- Create: `src/data/iso2to3.js`

**Interfaces:**
- Produces:
  - `src/data/worldCountries.geo.json`: `FeatureCollection` GeoJSON, 180 países, cada `feature.id` en ISO alpha-3 (ej. `"USA"`), cada `feature.properties.name` con el nombre en inglés.
  - `src/data/iso2to3.js`: `export const ISO2_TO_ISO3` — objeto plano `{ [alpha2: string]: alpha3: string }`, 239 entradas.
- Consumido por `CountryChoroplethMap.jsx` (Task 5) para unir `country_code` (alpha-2, guardado en `portfolio_events`) con las features del GeoJSON (alpha-3).

- [ ] **Step 1: Descargar el GeoJSON mundial**

```bash
curl -s -m 15 "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json" -o src/data/worldCountries.geo.json
```

- [ ] **Step 2: Verificar la descarga**

```bash
node -e "
const world = JSON.parse(require('fs').readFileSync('src/data/worldCountries.geo.json', 'utf8'));
console.log('type:', world.type);
console.log('features:', world.features.length);
console.log('sample id:', world.features[0].id, world.features[0].properties.name);
"
```

Esperado: `type: FeatureCollection`, `features: 180`, un `sample id` de 3 letras (ej. `AFG Afghanistan`).

- [ ] **Step 3: Crear el mapeo ISO alpha-2 → alpha-3**

Crear `src/data/iso2to3.js` con este contenido exacto (239 entradas, ya verificado contra `worldCountries.geo.json` — cubre todos los `id` del GeoJSON excepto `-99` y `CS-KM`, que no son códigos ISO alpha-3 reales y no representan ningún país con código asignable):

```javascript
// ISO 3166-1 alpha-2 -> alpha-3 country code mapping
// usado para unir country_code (alpha-2, guardado en portfolio_events) con
// las features de worldCountries.geo.json (id en alpha-3)
export const ISO2_TO_ISO3 = {
  AD: 'AND',
  AE: 'ARE',
  AF: 'AFG',
  AG: 'ATG',
  AI: 'AIA',
  AL: 'ALB',
  AM: 'ARM',
  AO: 'AGO',
  AQ: 'ATA',
  AR: 'ARG',
  AS: 'ASM',
  AT: 'AUT',
  AU: 'AUS',
  AW: 'ABW',
  AX: 'ALA',
  AZ: 'AZE',
  BA: 'BIH',
  BB: 'BRB',
  BD: 'BGD',
  BE: 'BEL',
  BF: 'BFA',
  BG: 'BGR',
  BH: 'BHR',
  BI: 'BDI',
  BJ: 'BEN',
  BL: 'BLM',
  BM: 'BMU',
  BN: 'BRN',
  BO: 'BOL',
  BR: 'BRA',
  BS: 'BHS',
  BT: 'BTN',
  BW: 'BWA',
  BY: 'BLR',
  BZ: 'BLZ',
  CA: 'CAN',
  CD: 'COD',
  CF: 'CAF',
  CG: 'COG',
  CH: 'CHE',
  CI: 'CIV',
  CK: 'COK',
  CL: 'CHL',
  CM: 'CMR',
  CN: 'CHN',
  TW: 'TWN',
  CO: 'COL',
  CR: 'CRI',
  CU: 'CUB',
  CV: 'CPV',
  CW: 'CUW',
  CY: 'CYP',
  CZ: 'CZE',
  DE: 'DEU',
  DJ: 'DJI',
  DK: 'DNK',
  DM: 'DMA',
  DO: 'DOM',
  DZ: 'DZA',
  EC: 'ECU',
  EE: 'EST',
  EG: 'EGY',
  EH: 'ESH',
  ER: 'ERI',
  ES: 'ESP',
  ET: 'ETH',
  FI: 'FIN',
  FJ: 'FJI',
  FK: 'FLK',
  FM: 'FSM',
  FO: 'FRO',
  FR: 'FRA',
  GA: 'GAB',
  GB: 'GBR',
  GD: 'GRD',
  GE: 'GEO',
  GF: 'GUF',
  GG: 'GGY',
  GH: 'GHA',
  GI: 'GIB',
  GL: 'GRL',
  GM: 'GMB',
  GN: 'GIN',
  GQ: 'GNQ',
  GR: 'GRC',
  GS: 'SGS',
  GT: 'GTM',
  GU: 'GUM',
  GW: 'GNB',
  GY: 'GUY',
  HK: 'HKG',
  HM: 'HMD',
  HN: 'HND',
  HR: 'HRV',
  HT: 'HTI',
  HU: 'HUN',
  ID: 'IDN',
  IE: 'IRL',
  IL: 'ISR',
  IM: 'IMN',
  IN: 'IND',
  IO: 'IOT',
  IQ: 'IRQ',
  IR: 'IRN',
  IS: 'ISL',
  IT: 'ITA',
  JE: 'JEY',
  JM: 'JAM',
  JO: 'JOR',
  JP: 'JPN',
  KE: 'KEN',
  KG: 'KGZ',
  KH: 'KHM',
  KI: 'KIR',
  KM: 'COM',
  KN: 'KNA',
  KP: 'PRK',
  KR: 'KOR',
  KW: 'KWT',
  KY: 'CYM',
  KZ: 'KAZ',
  LA: 'LAO',
  LB: 'LBN',
  LC: 'LCA',
  LI: 'LIE',
  LK: 'LKA',
  LR: 'LBR',
  LS: 'LSO',
  LT: 'LTU',
  LU: 'LUX',
  LV: 'LVA',
  LY: 'LBY',
  MA: 'MAR',
  MC: 'MCO',
  MD: 'MDA',
  ME: 'MNE',
  MF: 'MAF',
  MG: 'MDG',
  MH: 'MHL',
  MK: 'MKD',
  ML: 'MLI',
  MM: 'MMR',
  MN: 'MNG',
  MO: 'MAC',
  MP: 'MNP',
  MR: 'MRT',
  MS: 'MSR',
  MT: 'MLT',
  MU: 'MUS',
  MV: 'MDV',
  MW: 'MWI',
  MX: 'MEX',
  MY: 'MYS',
  MZ: 'MOZ',
  NA: 'NAM',
  NC: 'NCL',
  NE: 'NER',
  NF: 'NFK',
  NG: 'NGA',
  NI: 'NIC',
  NL: 'NLD',
  NO: 'NOR',
  NP: 'NPL',
  NR: 'NRU',
  NU: 'NIU',
  NZ: 'NZL',
  OM: 'OMN',
  PA: 'PAN',
  PE: 'PER',
  PF: 'PYF',
  PG: 'PNG',
  PH: 'PHL',
  PK: 'PAK',
  PL: 'POL',
  PM: 'SPM',
  PN: 'PCN',
  PR: 'PRI',
  PS: 'PSE',
  PT: 'PRT',
  PW: 'PLW',
  PY: 'PRY',
  QA: 'QAT',
  RO: 'ROU',
  RS: 'SRB',
  RU: 'RUS',
  RW: 'RWA',
  SA: 'SAU',
  SB: 'SLB',
  SC: 'SYC',
  SD: 'SDN',
  SE: 'SWE',
  SG: 'SGP',
  SH: 'SHN',
  SI: 'SVN',
  SK: 'SVK',
  SL: 'SLE',
  SM: 'SMR',
  SN: 'SEN',
  SO: 'SOM',
  SR: 'SUR',
  SS: 'SSD',
  ST: 'STP',
  SV: 'SLV',
  SX: 'SXM',
  SY: 'SYR',
  SZ: 'SWZ',
  TC: 'TCA',
  TD: 'TCD',
  TF: 'ATF',
  TG: 'TGO',
  TH: 'THA',
  TJ: 'TJK',
  TL: 'TLS',
  TM: 'TKM',
  TN: 'TUN',
  TO: 'TON',
  TR: 'TUR',
  TT: 'TTO',
  TV: 'TUV',
  TZ: 'TZA',
  UA: 'UKR',
  UG: 'UGA',
  UM: 'UMI',
  US: 'USA',
  UY: 'URY',
  UZ: 'UZB',
  VA: 'VAT',
  VC: 'VCT',
  VE: 'VEN',
  VG: 'VGB',
  VI: 'VIR',
  VN: 'VNM',
  VU: 'VUT',
  WF: 'WLF',
  WS: 'WSM',
  YE: 'YEM',
  ZA: 'ZAF',
  ZM: 'ZMB',
  ZW: 'ZWE',
};
```

- [ ] **Step 4: Verificar la cobertura del mapeo contra el GeoJSON**

```bash
node --input-type=module -e "
import fs from 'node:fs';
import { ISO2_TO_ISO3 } from './src/data/iso2to3.js';
const world = JSON.parse(fs.readFileSync('src/data/worldCountries.geo.json', 'utf8'));
console.log('features:', world.features.length);
console.log('iso2to3 entries:', Object.keys(ISO2_TO_ISO3).length);
const worldIds = new Set(world.features.map((f) => f.id));
const mapped = new Set(Object.values(ISO2_TO_ISO3));
const uncovered = [...worldIds].filter((id) => !mapped.has(id));
console.log('uncovered world ids:', uncovered);
"
```

Esperado exacto: `features: 180`, `iso2to3 entries: 239`, `uncovered world ids: [ '-99', 'CS-KM' ]`. Si `uncovered` tiene entradas distintas a esas dos, algo se corrompió al copiar el archivo — revisar antes de continuar.

- [ ] **Step 5: Commit**

```bash
git add src/data/worldCountries.geo.json src/data/iso2to3.js
git commit -m "$(cat <<'EOF'
feat: agregar dataset geográfico mundial para el mapa de países de Analytics

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Componentes de mapa + integración en `AnalyticsPage`

**Files:**
- Create: `src/components/analytics/Map.jsx`
- Create: `src/components/analytics/MapGeoJSON.jsx`
- Create: `src/components/analytics/CountryChoroplethMap.jsx`
- Modify: `src/pages/AnalyticsPage.jsx`
- Modify: `src/styles/global.css`
- Modify: `package.json` (agregar `maplibre-gl`)

**Interfaces:**
- Consumes: `ISO2_TO_ISO3` y `worldCountries.geo.json` (Task 4); RPC `get_portfolio_geo_map` (Task 2) — filas `{ country_code, country, visits }`; `useTheme()` de `src/context/ThemeContext.jsx` (`{ theme, toggleTheme }`).
- Produces:
  - `Map.jsx`: `export default function Map({ children, className, theme, center, zoom, loading })` + `export function useMap()` → `{ map, isLoaded, resolvedTheme }`.
  - `MapGeoJSON.jsx`: `export default function MapGeoJSON({ data, id, promoteId, fillPaint, linePaint, fillHoverPaint, onClick, onHover, interactive, beforeId })`, no renderiza nada visible (`return null`), maneja capas de MapLibre.
  - `CountryChoroplethMap.jsx`: `export default function CountryChoroplethMap({ geoMap })`.

- [ ] **Step 1: Instalar `maplibre-gl`**

```bash
npm install maplibre-gl
```

Verificar que `package.json` (`dependencies`) ahora incluye `"maplibre-gl"`.

- [ ] **Step 2: Crear `src/components/analytics/Map.jsx`**

```jsx
import {
  createContext, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import * as MapLibreGL from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

if (typeof window !== 'undefined' && !MapLibreGL.getWorkerUrl()) {
  MapLibreGL.setWorkerUrl(
    `https://unpkg.com/maplibre-gl@${MapLibreGL.getVersion()}/dist/maplibre-gl-worker.mjs`,
  );
}

const DEFAULT_STYLES = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

const MapContext = createContext(null);

export function useMap() {
  const context = useContext(MapContext);
  if (!context) throw new Error('useMap must be used within a Map component');
  return context;
}

export default function Map({
  children, className, theme = 'light', center = [10, 20], zoom = 0.4, loading = false,
}) {
  const containerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [initError, setInitError] = useState(false);
  const currentStyleRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const initialStyle = theme === 'dark' ? DEFAULT_STYLES.dark : DEFAULT_STYLES.light;
    currentStyleRef.current = initialStyle;

    let map;
    try {
      map = new MapLibreGL.Map({
        container: containerRef.current,
        style: initialStyle,
        center,
        zoom,
        renderWorldCopies: false,
        attributionControl: { compact: true },
      });
    } catch (err) {
      console.error('map init failed:', err);
      setInitError(true);
      return undefined;
    }

    const handleLoad = () => setIsLoaded(true);
    const handleStyleLoad = () => setIsStyleLoaded(true);
    const handleError = (e) => console.error('map error:', e.error);
    map.on('load', handleLoad);
    map.on('style.load', handleStyleLoad);
    map.on('error', handleError);
    setMapInstance(map);

    return () => {
      map.off('load', handleLoad);
      map.off('style.load', handleStyleLoad);
      map.off('error', handleError);
      map.remove();
      setIsLoaded(false);
      setIsStyleLoaded(false);
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstance) return;
    const newStyle = theme === 'dark' ? DEFAULT_STYLES.dark : DEFAULT_STYLES.light;
    if (currentStyleRef.current === newStyle) return;
    currentStyleRef.current = newStyle;
    setIsStyleLoaded(false);
    mapInstance.setStyle(newStyle, { diff: false });
  }, [mapInstance, theme]);

  const contextValue = useMemo(() => ({
    map: mapInstance,
    isLoaded: isLoaded && isStyleLoaded,
    resolvedTheme: theme,
  }), [mapInstance, isLoaded, isStyleLoaded, theme]);

  if (initError) {
    return <div ref={containerRef} className={`an-map${className ? ` ${className}` : ''}`} />;
  }

  return (
    <MapContext.Provider value={contextValue}>
      <div ref={containerRef} className={`an-map${className ? ` ${className}` : ''}`}>
        {(!isLoaded || loading) && (
          <div className="an-map-loading">
            <span />
            <span />
            <span />
          </div>
        )}
        {mapInstance && children}
      </div>
    </MapContext.Provider>
  );
}
```

- [ ] **Step 3: Crear `src/components/analytics/MapGeoJSON.jsx`**

```jsx
import { useEffect, useId, useMemo, useRef } from 'react';
import { useMap } from './Map.jsx';

function mergeHoverPaint(paint, hoverPaint) {
  if (!hoverPaint) return paint;
  const merged = { ...paint };
  for (const [key, hoverValue] of Object.entries(hoverPaint)) {
    if (hoverValue === undefined) continue;
    const baseValue = merged[key];
    merged[key] = baseValue === undefined
      ? hoverValue
      : ['case', ['boolean', ['feature-state', 'hover'], false], hoverValue, baseValue];
  }
  return merged;
}

const GEOJSON_DEFAULT_COLORS = {
  light: { fill: '#d4d4d4', line: '#ffffff' },
  dark: { fill: '#404040', line: '#171717' },
};

export default function MapGeoJSON({
  data, id: propId, promoteId, fillPaint, linePaint, fillHoverPaint,
  onClick, onHover, interactive = false, beforeId,
}) {
  const { map, isLoaded, resolvedTheme } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `geojson-source-${id}`;
  const fillLayerId = `geojson-fill-${id}`;
  const lineLayerId = `geojson-line-${id}`;

  const defaults = GEOJSON_DEFAULT_COLORS[resolvedTheme] ?? GEOJSON_DEFAULT_COLORS.light;
  const showFill = fillPaint !== false;
  const showLine = linePaint !== false;

  const mergedFillPaint = useMemo(
    () => mergeHoverPaint({ 'fill-color': defaults.fill, ...(fillPaint || {}) }, fillHoverPaint),
    [defaults.fill, fillPaint, fillHoverPaint],
  );
  const mergedLinePaint = useMemo(
    () => ({ 'line-color': defaults.line, 'line-width': 0.5, ...(linePaint || {}) }),
    [defaults.line, linePaint],
  );
  const latestRef = useRef({ onClick, onHover });
  latestRef.current = { onClick, onHover };

  useEffect(() => {
    if (!isLoaded || !map) return undefined;
    map.addSource(sourceId, { type: 'geojson', data, ...(promoteId ? { promoteId } : {}) });
    return () => {
      try {
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // style may be mid-reload
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId);
    source?.setData(data);
  }, [isLoaded, map, data, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId);
    if (!source) return;

    if (showFill && !map.getLayer(fillLayerId)) {
      map.addLayer({ id: fillLayerId, type: 'fill', source: sourceId, paint: mergedFillPaint }, beforeId);
    } else if (!showFill && map.getLayer(fillLayerId)) {
      map.removeLayer(fillLayerId);
    }

    if (showLine && !map.getLayer(lineLayerId)) {
      map.addLayer({ id: lineLayerId, type: 'line', source: sourceId, paint: mergedLinePaint }, beforeId);
    } else if (!showLine && map.getLayer(lineLayerId)) {
      map.removeLayer(lineLayerId);
    }

    if (showFill && map.getLayer(fillLayerId)) {
      for (const [key, value] of Object.entries(mergedFillPaint)) {
        map.setPaintProperty(fillLayerId, key, value);
      }
    }
    if (showLine && map.getLayer(lineLayerId)) {
      for (const [key, value] of Object.entries(mergedLinePaint)) {
        map.setPaintProperty(lineLayerId, key, value);
      }
    }
  }, [isLoaded, map, sourceId, fillLayerId, lineLayerId, showFill, showLine, mergedFillPaint, mergedLinePaint, beforeId]);

  useEffect(() => {
    if (!isLoaded || !map || !interactive || !showFill) return undefined;
    let hoveredId = null;

    const setHover = (next) => {
      if (next === hoveredId) return;
      const sourceExists = !!map.getSource(sourceId);
      if (hoveredId != null && sourceExists) {
        map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
      }
      hoveredId = next;
      if (next != null && sourceExists) {
        map.setFeatureState({ source: sourceId, id: next }, { hover: true });
      }
    };

    const handleMouseMove = (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      map.getCanvas().style.cursor = 'pointer';
      const featureId = feature.id;
      if (featureId === hoveredId) return;
      setHover(featureId ?? null);
      latestRef.current.onHover?.({
        feature, longitude: e.lngLat.lng, latitude: e.lngLat.lat, originalEvent: e,
      });
    };

    const handleMouseLeave = () => {
      setHover(null);
      map.getCanvas().style.cursor = '';
      latestRef.current.onHover?.(null);
    };

    const handleClick = (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      latestRef.current.onClick?.({
        feature, longitude: e.lngLat.lng, latitude: e.lngLat.lat, originalEvent: e,
      });
    };

    map.on('mousemove', fillLayerId, handleMouseMove);
    map.on('mouseleave', fillLayerId, handleMouseLeave);
    map.on('click', fillLayerId, handleClick);

    return () => {
      map.off('mousemove', fillLayerId, handleMouseMove);
      map.off('mouseleave', fillLayerId, handleMouseLeave);
      map.off('click', fillLayerId, handleClick);
      setHover(null);
      map.getCanvas().style.cursor = '';
    };
  }, [isLoaded, map, fillLayerId, sourceId, interactive, showFill]);

  return null;
}
```

- [ ] **Step 4: Crear `src/components/analytics/CountryChoroplethMap.jsx`**

```jsx
import { useEffect, useMemo, useRef } from 'react';
import * as MapLibreGL from 'maplibre-gl';
import Map, { useMap } from './Map.jsx';
import MapGeoJSON from './MapGeoJSON.jsx';
import worldCountries from '../../data/worldCountries.geo.json';
import { ISO2_TO_ISO3 } from '../../data/iso2to3.js';
import { useTheme } from '../../context/ThemeContext.jsx';

function buildChoroplethData(geoMap) {
  const visitsByAlpha3 = new Map();
  geoMap.forEach((row) => {
    const alpha3 = ISO2_TO_ISO3[row.country_code];
    if (!alpha3) return;
    visitsByAlpha3.set(alpha3, { visits: Number(row.visits), country: row.country });
  });
  return {
    ...worldCountries,
    features: worldCountries.features.map((feature) => {
      const match = visitsByAlpha3.get(feature.id);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          visits: match ? match.visits : 0,
          countryLabel: match ? match.country : feature.properties?.name,
        },
      };
    }),
  };
}

function ChoroplethLayer({ data, maxVisits }) {
  const { map } = useMap();
  const popupRef = useRef(null);

  useEffect(() => {
    popupRef.current = new MapLibreGL.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, []);

  const handleHover = (e) => {
    const popup = popupRef.current;
    if (!popup || !map) return;
    if (!e) {
      popup.remove();
      return;
    }
    const { countryLabel, visits } = e.feature.properties;
    popup
      .setLngLat([e.longitude, e.latitude])
      .setText(`${countryLabel}: ${visits} visita${visits === 1 ? '' : 's'}`)
      .addTo(map);
  };

  return (
    <MapGeoJSON
      data={data}
      interactive
      onHover={handleHover}
      fillPaint={{
        'fill-color': '#D97757',
        'fill-opacity': ['interpolate', ['linear'], ['get', 'visits'], 0, 0.05, maxVisits, 0.85],
      }}
      fillHoverPaint={{ 'fill-opacity': 1 }}
    />
  );
}

export default function CountryChoroplethMap({ geoMap }) {
  const { theme } = useTheme();
  const hasData = geoMap && geoMap.length > 0;
  const data = useMemo(() => (hasData ? buildChoroplethData(geoMap) : null), [geoMap, hasData]);
  const maxVisits = useMemo(
    () => (hasData ? Math.max(...geoMap.map((r) => Number(r.visits))) : 0),
    [geoMap, hasData],
  );

  if (!data) return null;

  return (
    <div className="an-map-wrap">
      <Map theme={theme} center={[10, 20]} zoom={0.4}>
        <ChoroplethLayer data={data} maxVisits={maxVisits} />
      </Map>
    </div>
  );
}
```

- [ ] **Step 5: Agregar estilos en `src/styles/global.css`**

Buscar el bloque de reglas `.an-list` (cerca de la línea 720) y agregar justo después:

```css
.an-map-wrap { margin-bottom: 16px; border-radius: 10px; overflow: hidden; border: 1px solid var(--a-border); }
.an-map { position: relative; width: 100%; height: 320px; background: var(--a-panel-2); }
.an-map-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 6px; background: var(--a-panel-2); }
.an-map-loading span { width: 6px; height: 6px; border-radius: 999px; background: var(--a-muted); animation: an-map-pulse 1s ease-in-out infinite; }
.an-map-loading span:nth-child(2) { animation-delay: 150ms; }
.an-map-loading span:nth-child(3) { animation-delay: 300ms; }
@keyframes an-map-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
.an-map-wrap .maplibregl-popup-content {
  background: var(--a-panel); color: var(--a-text); font-family: var(--font-body);
  font-size: 12px; padding: 6px 10px; border-radius: 6px; box-shadow: var(--a-shadow-sm);
  border: 1px solid var(--a-border);
}
.an-map-wrap .maplibregl-popup-tip { border-top-color: var(--a-panel); border-bottom-color: var(--a-panel); }
```

- [ ] **Step 6: Integrar en `src/pages/AnalyticsPage.jsx`**

Agregar el import (junto a los demás imports de componentes, después de la línea `import StatCard from '../components/admin/StatCard.jsx';`):

```javascript
import CountryChoroplethMap from '../components/analytics/CountryChoroplethMap.jsx';
```

Agregar el estado `geoMap` (junto a `const [geo, setGeo] = useState([]);`):

```javascript
  const [geoMap, setGeoMap] = useState([]);
```

En `fetchStats`, agregar la llamada al RPC dentro del `Promise.all` (junto a `geoRes`):

```javascript
    const [
      overviewRes, trendRes, funnelRes, topProjectsRes, referrersRes, geoRes, geoMapRes, devicesRes,
    ] = await Promise.all([
      supabase.rpc('get_portfolio_overview', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_daily_trend', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_funnel', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_top_projects', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_referrers', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_geo', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_geo_map', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_devices', { p_portfolio_id: id || null, p_days: days }),
    ]);
    const anyError = [overviewRes, trendRes, funnelRes, topProjectsRes, referrersRes, geoRes, devicesRes]
      .some((r) => r.error);
    if (anyError) setError('No se pudieron cargar algunas métricas.');
    setOverview((overviewRes.data && overviewRes.data[0]) || null);
    setTrend(trendRes.data || []);
    setFunnel(funnelRes.data || []);
    setTopProjects(topProjectsRes.data || []);
    setReferrers(referrersRes.data || []);
    setGeo(geoRes.data || []);
    setGeoMap(geoMapRes.error ? [] : (geoMapRes.data || []));
    setDevices(devicesRes.data || []);
```

Nota: `geoMapRes` queda deliberadamente fuera de `anyError` — si falla, el mapa simplemente no se renderiza (`geoMap` vacío) pero el resto del dashboard, incluida la lista de países (`geoRes`), sigue funcionando.

En la sección "Países" (busca `<h2 className="an-panel-title">Países</h2>`), agregar el mapa antes de la lista existente:

```jsx
                <div className="an-panel">
                  <h2 className="an-panel-title">Países</h2>
                  <CountryChoroplethMap geoMap={geoMap} />
                  {geo.length === 0 ? <p className="adm-empty">Sin datos todavía.</p> : (
                    <ul className="an-list">
                      {geo.map((g) => (
                        <li key={g.country}><span>{g.country}</span><span>{g.visits}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
```

- [ ] **Step 7: Verificar que el build pasa**

```bash
npm run build
```

Esperado: build exitoso, sin errores.

- [ ] **Step 8: Verificación visual en navegador**

Levantar el dev server (`preview_start` con `name` apuntando a `npm run dev`, ver `.claude/launch.json` — crearlo si no existe con `runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 5173`), iniciar sesión como el usuario dueño de un portfolio con al menos un evento `view` con `country_code` (el insertado en Task 3 si no se limpió, o generar uno nuevo repitiendo el curl del Task 3 Step 3 sin borrar la fila), y navegar a `/analytics` o `/analytics/<id>`.

Confirmar con `read_page`/`computer` screenshot:
- El mapa mundial se renderiza dentro del panel "Países", arriba de la lista existente.
- El país con datos aparece resaltado (más opaco que el resto).
- Al hacer hover sobre el país resaltado aparece un tooltip con `"<País>: N visitas"`.
- Alternar el tema (botón de `ThemeToggle`) cambia el basemap del mapa entre claro y oscuro.
- La lista de texto debajo del mapa sigue mostrando los mismos datos que antes (sin regresión).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/components/analytics/Map.jsx src/components/analytics/MapGeoJSON.jsx src/components/analytics/CountryChoroplethMap.jsx src/pages/AnalyticsPage.jsx src/styles/global.css
git commit -m "$(cat <<'EOF'
feat: agregar mapa mundial choropleth de países en Analytics

Port de los componentes Map/MapGeoJSON de mapcn.dev a JSX plano (sin
Tailwind/TS), coloreado por visitas usando el RPC get_portfolio_geo_map.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
