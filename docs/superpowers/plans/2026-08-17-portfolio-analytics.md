# Analytics de portfolio (captura de eventos + dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capturar eventos reales de visita (vistas, clics en proyectos/contacto/CV, scroll depth, tiempo en página, referrer, geo, dispositivo) por portfolio publicado, y mostrarlos en una página de analytics dedicada por portfolio.

**Architecture:** Una tabla `portfolio_events` en Postgres recibe un evento por fila, insertado exclusivamente por una Edge Function `track-event` (usa la service role key, hace geo-lookup server-side por IP). El cliente dispara eventos con un util `src/lib/tracking.js` desde la página pública del portfolio. Un conjunto de RPCs `security definer` agregan los eventos para el dueño del portfolio. `AnalyticsPage.jsx` (ruta nueva `/analytics/:id`) consume esos RPCs y grafica con `recharts`. Como parte del trabajo se agrega también subida de CV a Supabase Storage (bucket `cvs`) con botón de descarga real en `ContactBlock`, necesaria para generar el evento `cv_click`.

**Tech Stack:** React (componentes existentes), `@supabase/supabase-js`, Supabase Edge Functions (Deno), `recharts` (ya en el proyecto), CSS plano en `src/styles/global.css`.

## Global Constraints

- Proyecto Supabase: `dzannfaklwjhmkoauokq` (`portfolio-builder`). Todas las migraciones/RPCs/funciones se aplican ahí vía las tools MCP de Supabase.
- No hay framework de testing en el proyecto. Verificación: `npm run build` pasando + revisión manual con `npm run dev` en el navegador.
- El tracking es best-effort y fire-and-forget: nunca debe bloquear ni romper la experiencia de la página pública del portfolio, ni mostrar errores al visitante.
- Fuera de alcance: sistema de planes/premium, gating de features, facturación. Todas las métricas quedan disponibles para todos los usuarios en esta iteración.
- Las funciones RPC de agregación siguen el mismo patrón que la función existente `increment_portfolio_views`: `language sql`, `security definer`, `set search_path to 'public'`.
- Bucket de Storage `cvs`: público para lectura, límite 10MB, solo `application/pdf`, escritura solo por el dueño (mismo patrón de políticas que el bucket `portfolio-images` ya existente).
- Edge Function `track-event`: `verify_jwt = false` (visitantes anónimos, sin sesión), CORS abierto (`Access-Control-Allow-Origin: *`).

---

## Task 1: Tabla `portfolio_events` y políticas RLS

**Files:**
- Ninguno en el repo — migración SQL aplicada vía MCP de Supabase.

**Interfaces:**
- Produces: tabla `public.portfolio_events` con las columnas descritas abajo, RLS habilitado con política de `select` solo para el dueño del portfolio. Las Tasks 2, 4, 6+ asumen que esta tabla existe con estos nombres de columna exactos.

- [ ] **Step 1: Aplicar la migración**

Usar la tool MCP `apply_migration` con `project_id: "dzannfaklwjhmkoauokq"`, `name: "portfolio_events_table"` y esta query:

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

Expected: la migración se aplica sin errores.

- [ ] **Step 2: Verificar la tabla y la política**

Usar la tool MCP `execute_sql` con `project_id: "dzannfaklwjhmkoauokq"`:

```sql
select column_name, data_type from information_schema.columns where table_name = 'portfolio_events' order by ordinal_position;
```

Expected: 13 filas con los nombres de columna listados arriba.

```sql
select policyname, cmd from pg_policies where tablename = 'portfolio_events';
```

Expected: 1 fila (`select`).

- [ ] **Step 3: Commit**

No hay archivos de repo que commitear en esta tarea. Continuar directamente a la Task 2.

---

## Task 2: RPCs de agregación

**Files:**
- Ninguno en el repo — migración SQL aplicada vía MCP de Supabase.

**Interfaces:**
- Consumes: tabla `portfolio_events` (Task 1).
- Produces: 7 funciones RPC que la Task 11 (`AnalyticsPage.jsx`) llama con `supabase.rpc(nombre, { p_portfolio_id, p_days })`:
  - `get_portfolio_overview(p_portfolio_id uuid, p_days int)` → una fila `{ total_views, unique_visitors, avg_seconds_on_page, contact_ctr }`.
  - `get_portfolio_daily_trend(p_portfolio_id uuid, p_days int)` → filas `{ day, views }`.
  - `get_portfolio_funnel(p_portfolio_id uuid, p_days int)` → filas `{ stage, sessions }` con `stage` en `('view','scroll_50','project_click','contact_or_cv')`.
  - `get_portfolio_top_projects(p_portfolio_id uuid, p_days int)` → filas `{ target_label, clicks }`.
  - `get_portfolio_referrers(p_portfolio_id uuid, p_days int)` → filas `{ referrer_domain, visits }`.
  - `get_portfolio_geo(p_portfolio_id uuid, p_days int)` → filas `{ country, visits }`.
  - `get_portfolio_devices(p_portfolio_id uuid, p_days int)` → filas `{ device_type, visits }`.
  - Todas devuelven vacío si `auth.uid()` no es el dueño del `portfolio_id` (chequeo interno, no dependen de que el caller ya haya filtrado).

- [ ] **Step 1: Aplicar la migración con las 7 funciones**

Usar la tool MCP `apply_migration` con `project_id: "dzannfaklwjhmkoauokq"`, `name: "portfolio_analytics_rpcs"` y esta query:

```sql
create or replace function public.get_portfolio_overview(p_portfolio_id uuid, p_days int default null)
returns table (total_views bigint, unique_visitors bigint, avg_seconds_on_page numeric, contact_ctr numeric)
language sql
security definer
set search_path to 'public'
as $$
  with owned as (
    select id from portfolios where id = p_portfolio_id and user_id = auth.uid()
  ),
  scoped as (
    select * from portfolio_events
    where portfolio_id in (select id from owned)
    and (p_days is null or created_at >= now() - (p_days || ' days')::interval)
  )
  select
    count(*) filter (where event_type = 'view') as total_views,
    count(distinct session_id) filter (where event_type = 'view') as unique_visitors,
    round(avg(value) filter (where event_type = 'session_end'), 1) as avg_seconds_on_page,
    case
      when count(distinct session_id) filter (where event_type = 'view') = 0 then 0
      else round(
        100.0 * count(distinct session_id) filter (where event_type in ('contact_click','cv_click'))
        / count(distinct session_id) filter (where event_type = 'view'),
        1
      )
    end as contact_ctr
  from scoped;
$$;

create or replace function public.get_portfolio_daily_trend(p_portfolio_id uuid, p_days int default 30)
returns table (day date, views bigint)
language sql
security definer
set search_path to 'public'
as $$
  with owned as (
    select id from portfolios where id = p_portfolio_id and user_id = auth.uid()
  )
  select date_trunc('day', created_at)::date as day, count(*) as views
  from portfolio_events
  where portfolio_id in (select id from owned)
  and event_type = 'view'
  and (p_days is null or created_at >= now() - (p_days || ' days')::interval)
  group by 1
  order by 1;
$$;

create or replace function public.get_portfolio_funnel(p_portfolio_id uuid, p_days int default null)
returns table (stage text, sessions bigint)
language sql
security definer
set search_path to 'public'
as $$
  with owned as (
    select id from portfolios where id = p_portfolio_id and user_id = auth.uid()
  ),
  scoped as (
    select * from portfolio_events
    where portfolio_id in (select id from owned)
    and (p_days is null or created_at >= now() - (p_days || ' days')::interval)
  )
  select 'view' as stage, count(distinct session_id) as sessions from scoped where event_type = 'view'
  union all
  select 'scroll_50', count(distinct session_id) from scoped where event_type = 'scroll_depth' and value >= 50
  union all
  select 'project_click', count(distinct session_id) from scoped where event_type = 'project_click'
  union all
  select 'contact_or_cv', count(distinct session_id) from scoped where event_type in ('contact_click','cv_click');
$$;

create or replace function public.get_portfolio_top_projects(p_portfolio_id uuid, p_days int default null)
returns table (target_label text, clicks bigint)
language sql
security definer
set search_path to 'public'
as $$
  with owned as (
    select id from portfolios where id = p_portfolio_id and user_id = auth.uid()
  )
  select coalesce(target_label, 'Sin nombre') as target_label, count(*) as clicks
  from portfolio_events
  where portfolio_id in (select id from owned)
  and event_type = 'project_click'
  and (p_days is null or created_at >= now() - (p_days || ' days')::interval)
  group by 1
  order by 2 desc
  limit 10;
$$;

create or replace function public.get_portfolio_referrers(p_portfolio_id uuid, p_days int default null)
returns table (referrer_domain text, visits bigint)
language sql
security definer
set search_path to 'public'
as $$
  with owned as (
    select id from portfolios where id = p_portfolio_id and user_id = auth.uid()
  )
  select coalesce(referrer_domain, 'Directo') as referrer_domain, count(*) as visits
  from portfolio_events
  where portfolio_id in (select id from owned)
  and event_type = 'view'
  and (p_days is null or created_at >= now() - (p_days || ' days')::interval)
  group by 1
  order by 2 desc
  limit 10;
$$;

create or replace function public.get_portfolio_geo(p_portfolio_id uuid, p_days int default null)
returns table (country text, visits bigint)
language sql
security definer
set search_path to 'public'
as $$
  with owned as (
    select id from portfolios where id = p_portfolio_id and user_id = auth.uid()
  )
  select coalesce(country, 'Desconocido') as country, count(*) as visits
  from portfolio_events
  where portfolio_id in (select id from owned)
  and event_type = 'view'
  and (p_days is null or created_at >= now() - (p_days || ' days')::interval)
  group by 1
  order by 2 desc
  limit 10;
$$;

create or replace function public.get_portfolio_devices(p_portfolio_id uuid, p_days int default null)
returns table (device_type text, visits bigint)
language sql
security definer
set search_path to 'public'
as $$
  with owned as (
    select id from portfolios where id = p_portfolio_id and user_id = auth.uid()
  )
  select coalesce(device_type, 'desconocido') as device_type, count(*) as visits
  from portfolio_events
  where portfolio_id in (select id from owned)
  and event_type = 'view'
  and (p_days is null or created_at >= now() - (p_days || ' days')::interval)
  group by 1
  order by 2 desc;
$$;
```

Expected: la migración se aplica sin errores.

- [ ] **Step 2: Verificar que las 7 funciones existen**

Usar la tool MCP `execute_sql`:

```sql
select proname from pg_proc where proname like 'get_portfolio_%' order by 1;
```

Expected: 7 filas (`get_portfolio_daily_trend`, `get_portfolio_devices`, `get_portfolio_funnel`, `get_portfolio_geo`, `get_portfolio_overview`, `get_portfolio_referrers`, `get_portfolio_top_projects`).

- [ ] **Step 3: Commit**

No hay archivos de repo que commitear en esta tarea. Continuar directamente a la Task 3.

---

## Task 3: Bucket de Storage `cvs` y políticas RLS

**Files:**
- Ninguno en el repo — migración SQL aplicada vía MCP de Supabase.

**Interfaces:**
- Produces: bucket `cvs` (público, `file_size_limit` 10MB, `allowed_mime_types` `application/pdf`) con 4 políticas RLS sobre `storage.objects` que la Task 7 asume que existen.

- [ ] **Step 1: Aplicar la migración**

Usar la tool MCP `apply_migration` con `project_id: "dzannfaklwjhmkoauokq"`, `name: "cvs_bucket"` y esta query:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', true, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "cvs public read"
on storage.objects for select
using (bucket_id = 'cvs');

create policy "cvs owner insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "cvs owner update"
on storage.objects for update
to authenticated
using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "cvs owner delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);
```

Expected: la migración se aplica sin errores.

- [ ] **Step 2: Verificar el bucket y las políticas**

Usar la tool MCP `execute_sql`:

```sql
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'cvs';
```

Expected: una fila con `public = true`, `file_size_limit = 10485760`, `allowed_mime_types = {application/pdf}`.

```sql
select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'cvs%';
```

Expected: 4 filas.

- [ ] **Step 3: Commit**

No hay archivos de repo que commitear en esta tarea. Continuar directamente a la Task 4.

---

## Task 4: Edge Function `track-event`

**Files:**
- Ninguno en el repo — la función se despliega directamente vía MCP (no hay carpeta `supabase/functions` local en este proyecto).

**Interfaces:**
- Consumes: tabla `portfolio_events` (Task 1), tabla `portfolios` (existente).
- Produces: endpoint público `POST {SUPABASE_URL}/functions/v1/track-event` que la Task 5 (`src/lib/tracking.js`) llama. Request body: `{ portfolio_id: string, event_type: string, target_id?: string, target_label?: string, referrer?: string, session_id: string, value?: number, device_type?: string }`. Responde `204` en éxito, `400`/`404`/`405`/`500` con `{ error: string }` en fallo.

- [ ] **Step 1: Desplegar la función**

Usar la tool MCP `deploy_edge_function` con `project_id: "dzannfaklwjhmkoauokq"`, `name: "track-event"`, `entrypoint_path: "index.ts"`, `verify_jwt: false`, y `files`:

```json
[
  {
    "name": "index.ts",
    "content": "import { createClient } from 'jsr:@supabase/supabase-js@2';\n\nconst EVENT_TYPES = new Set([\n  'view', 'project_click', 'contact_click', 'cv_click', 'scroll_depth', 'session_end',\n]);\n\nconst CORS_HEADERS = {\n  'Access-Control-Allow-Origin': '*',\n  'Access-Control-Allow-Headers': 'content-type',\n  'Access-Control-Allow-Methods': 'POST, OPTIONS',\n};\n\nconst supabase = createClient(\n  Deno.env.get('SUPABASE_URL') as string,\n  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string,\n);\n\nfunction jsonResponse(body: unknown, status: number) {\n  return new Response(JSON.stringify(body), {\n    status,\n    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },\n  });\n}\n\nfunction parseReferrerDomain(referrer: string | null | undefined) {\n  if (!referrer) return null;\n  try {\n    return new URL(referrer).hostname;\n  } catch {\n    return null;\n  }\n}\n\nasync function lookupGeo(ip: string | null) {\n  if (!ip || ip === '127.0.0.1') return { country: null, city: null };\n  try {\n    const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(1500) });\n    if (!res.ok) return { country: null, city: null };\n    const data = await res.json();\n    return { country: data.country_name || null, city: data.city || null };\n  } catch {\n    return { country: null, city: null };\n  }\n}\n\nDeno.serve(async (req) => {\n  if (req.method === 'OPTIONS') {\n    return new Response(null, { headers: CORS_HEADERS });\n  }\n  if (req.method !== 'POST') {\n    return jsonResponse({ error: 'Method not allowed' }, 405);\n  }\n\n  let body: Record<string, unknown>;\n  try {\n    body = await req.json();\n  } catch {\n    return jsonResponse({ error: 'Invalid JSON' }, 400);\n  }\n\n  const {\n    portfolio_id, event_type, target_id, target_label, referrer, session_id, value, device_type,\n  } = body as Record<string, string | number | undefined>;\n\n  if (!portfolio_id || !session_id || typeof event_type !== 'string' || !EVENT_TYPES.has(event_type)) {\n    return jsonResponse({ error: 'Invalid payload' }, 400);\n  }\n\n  const { data: portfolio, error: portfolioError } = await supabase\n    .from('portfolios')\n    .select('id')\n    .eq('id', portfolio_id)\n    .eq('published', true)\n    .single();\n\n  if (portfolioError || !portfolio) {\n    return jsonResponse({ error: 'Portfolio not found' }, 404);\n  }\n\n  const forwardedFor = req.headers.get('x-forwarded-for');\n  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : null;\n  const { country, city } = await lookupGeo(ip);\n\n  const { error: insertError } = await supabase.from('portfolio_events').insert({\n    portfolio_id,\n    event_type,\n    target_id: target_id || null,\n    target_label: target_label || null,\n    referrer: referrer || null,\n    referrer_domain: parseReferrerDomain(referrer as string | undefined),\n    country,\n    city,\n    device_type: device_type || null,\n    session_id,\n    value: value ?? null,\n  });\n\n  if (insertError) {\n    return jsonResponse({ error: 'Insert failed' }, 500);\n  }\n\n  return new Response(null, { status: 204, headers: CORS_HEADERS });\n});\n"
  }
]
```

Expected: el despliegue se completa sin errores.

- [ ] **Step 2: Verificar que la función responde**

Usar la tool MCP `get_project_url` con `project_id: "dzannfaklwjhmkoauokq"` para obtener la URL base, luego probar con `curl` desde Bash (reemplazar `<SUPABASE_URL>` por el valor devuelto y `<PORTFOLIO_ID>` por el id de un portfolio publicado real, obtenido con `execute_sql`: `select id from portfolios where published = true limit 1;`):

```bash
curl -i -X POST "<SUPABASE_URL>/functions/v1/track-event" \
  -H "Content-Type: application/json" \
  -d '{"portfolio_id":"<PORTFOLIO_ID>","event_type":"view","session_id":"test-session-1"}'
```

Expected: `HTTP/2 204`.

Luego confirmar el insert con `execute_sql`:

```sql
select event_type, session_id, country, city from portfolio_events where session_id = 'test-session-1';
```

Expected: una fila con `event_type = 'view'` (`country`/`city` pueden ser `null` si la IP de origen del curl no es pública/geolocalizable — no es un fallo).

Limpiar el evento de prueba:

```sql
delete from portfolio_events where session_id = 'test-session-1';
```

- [ ] **Step 3: Commit**

No hay archivos de repo que commitear en esta tarea. Continuar directamente a la Task 5.

---

## Task 5: `src/lib/tracking.js`

**Files:**
- Create: `src/lib/tracking.js`

**Interfaces:**
- Produces:
  - `getOrCreateSessionId(portfolioId: string): string`
  - `getDeviceType(): 'mobile' | 'tablet' | 'desktop'`
  - `trackEvent(portfolioId: string, eventType: string, extra?: object): void` — fire-and-forget, nunca lanza ni rechaza.
  - Usadas por las Tasks 6, 8, 9, 10.

- [ ] **Step 1: Crear el archivo**

```js
function getFunctionsUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/functions/v1/track-event`;
}

export function getOrCreateSessionId(portfolioId) {
  const key = `pb-session-${portfolioId}`;
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export function getDeviceType() {
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export function trackEvent(portfolioId, eventType, extra = {}) {
  const payload = {
    portfolio_id: portfolioId,
    event_type: eventType,
    session_id: getOrCreateSessionId(portfolioId),
    referrer: document.referrer || null,
    ...extra,
  };
  const url = getFunctionsUrl();
  const body = JSON.stringify(payload);
  if (eventType === 'session_end' && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    return;
  }
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores (el módulo no se usa todavía en ningún componente).

- [ ] **Step 3: Commit**

```bash
git add src/lib/tracking.js
git commit -m "feat: add client-side portfolio event tracking helper"
```

---

## Task 6: Wiring de tracking en `PublicPortfolioPage.jsx` y `PortfolioRenderer.jsx`

**Files:**
- Modify: `src/pages/PublicPortfolioPage.jsx`
- Modify: `src/components/public/PortfolioRenderer.jsx`

**Interfaces:**
- Consumes: `trackEvent`, `getDeviceType` de `src/lib/tracking.js` (Task 5).
- Produces: `PortfolioRenderer` acepta una prop `onTrack(eventType: string, extra?: object)` y la pasa a cada componente de sección como prop `onTrack`. Las Tasks 8 y 9 (`ProjectsGrid`/`ProjectsList`/`ContactBlock`) consumen esa prop.

- [ ] **Step 1: Agregar prop `onTrack` a `PortfolioRenderer.jsx`**

Archivo completo:

```jsx
import { SECTION_COMPONENTS } from './sectionComponents.js';

export default function PortfolioRenderer({ sections, theme, onTrack }) {
  const active = sections.filter((s) => s.enabled);
  return (
    <div className="pf-scope" data-theme={theme}>
      <div className="pf-page">
        {active.length === 0 && (
          <div className="pf-section" style={{ textAlign: 'center', color: 'var(--p-muted)' }}>
            <p>Activa al menos una sección para ver tu portfolio aquí.</p>
          </div>
        )}
        {active.map((section) => {
          const variants = SECTION_COMPONENTS[section.type];
          const Comp = variants ? (variants[section.variant] || Object.values(variants)[0]) : null;
          return Comp ? <Comp key={section.id} content={section.content} onTrack={onTrack} /> : null;
        })}
        <footer className="pf-colophon">
          <p>Tipografía: Fraunces · Inter · JetBrains Mono</p>
        </footer>
      </div>
    </div>
  );
}
```

(`onTrack` queda `undefined` cuando se usa desde `PreviewTab.jsx`, que no la pasa; los componentes de sección que la consumen en las Tasks 8-9 usan un default `() => {}` para tolerar eso.)

- [ ] **Step 2: Reemplazar el tracking de vistas y agregar scroll/tiempo en página en `PublicPortfolioPage.jsx`**

Archivo completo:

```jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import PortfolioRenderer from '../components/public/PortfolioRenderer.jsx';
import { trackEvent, getDeviceType } from '../lib/tracking.js';

const SCROLL_THRESHOLDS = [25, 50, 75, 100];

export default function PublicPortfolioPage() {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState('loading');
  const [portfolio, setPortfolio] = useState(null);
  const userId = user ? user.id : null;
  const trackingEnabledRef = useRef(false);
  const portfolioIdRef = useRef(null);
  const firedThresholdsRef = useRef(new Set());
  const mountedAtRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState('loading');
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, user_id, sections, theme')
        .eq('slug', slug)
        .eq('published', true)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setState('notfound');
        return;
      }
      setPortfolio(data);
      setState('ready');
      if (authLoading) return;
      const isOwnerView = userId === data.user_id;
      trackingEnabledRef.current = !isOwnerView;
      portfolioIdRef.current = data.id;
      if (!isOwnerView) {
        const viewedKey = `pb-viewed-${data.id}`;
        if (!sessionStorage.getItem(viewedKey)) {
          trackEvent(data.id, 'view', { device_type: getDeviceType() });
          sessionStorage.setItem(viewedKey, '1');
        }
        mountedAtRef.current = Date.now();
      }
    })();
    return () => { cancelled = true; };
  }, [slug, userId, authLoading]);

  useEffect(() => {
    if (!portfolio) return undefined;
    const handleScroll = () => {
      if (!trackingEnabledRef.current) return;
      const scrollTop = window.scrollY;
      const viewportHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;
      const scrolled = fullHeight <= viewportHeight
        ? 100
        : ((scrollTop + viewportHeight) / fullHeight) * 100;
      for (const threshold of SCROLL_THRESHOLDS) {
        if (scrolled >= threshold && !firedThresholdsRef.current.has(threshold)) {
          firedThresholdsRef.current.add(threshold);
          trackEvent(portfolioIdRef.current, 'scroll_depth', { value: threshold });
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [portfolio]);

  useEffect(() => {
    if (!portfolio) return undefined;
    const sendSessionEnd = () => {
      if (!trackingEnabledRef.current || !mountedAtRef.current) return;
      const seconds = Math.round((Date.now() - mountedAtRef.current) / 1000);
      trackEvent(portfolioIdRef.current, 'session_end', { value: seconds });
      mountedAtRef.current = null;
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') sendSessionEnd();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', sendSessionEnd);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', sendSessionEnd);
    };
  }, [portfolio]);

  const handleTrack = useCallback((eventType, extra) => {
    if (!trackingEnabledRef.current) return;
    trackEvent(portfolioIdRef.current, eventType, extra);
  }, []);

  if (state === 'loading') {
    return (
      <div className="pf-scope" data-theme="light">
        <div className="pf-loading-screen">
          <div className="pf-loading-mark">
            <span className="pf-loading-ring" />
            <span className="pf-loading-ring pf-loading-ring-delay" />
            <span className="pf-loading-core" />
          </div>
          <p className="pf-loading-text">Cargando portfolio</p>
        </div>
      </div>
    );
  }
  if (state === 'notfound') {
    return (
      <div className="pf-scope" data-theme="light">
        <div className="pf-status-screen">
          <p className="pf-status-title">No encontramos este portfolio</p>
          <p className="pf-status-desc">El link puede estar mal escrito, o el portfolio aún no se ha publicado.</p>
        </div>
      </div>
    );
  }

  const isOwner = user && user.id === portfolio.user_id;

  return (
    <div className="pf-public-wrap">
      <PortfolioRenderer sections={portfolio.sections} theme={portfolio.theme} onTrack={handleTrack} />
      {isOwner && (
        <a className="pf-edit-fab" href={`/editor/${portfolio.id}`}><Pencil size={14} /> Editar</a>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificación manual en el navegador**

Run: `npm run dev`. Abrir `/p/<slug>` de un portfolio publicado en ventana privada/incógnito (sin sesión).

Expected:
- La página carga y se registra un evento `view` (confirmar con `execute_sql`: `select event_type, device_type, referrer_domain from portfolio_events where portfolio_id = '<id>' order by created_at desc limit 5;`).
- Hacer scroll hasta el fondo: aparecen eventos `scroll_depth` con `value` 25/50/75/100 (puede tardar un segundo por el fetch async).
- Cerrar la pestaña o navegar a otra URL: aparece un evento `session_end` con `value` (segundos) razonable.
- Abrir el mismo portfolio con sesión iniciada como su dueño: no debe registrarse ningún evento nuevo.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PublicPortfolioPage.jsx src/components/public/PortfolioRenderer.jsx
git commit -m "feat: track portfolio views, scroll depth and time on page"
```

---

## Task 7: `src/lib/cvUpload.js` y campo `cvUrl`

**Files:**
- Create: `src/lib/cvUpload.js`
- Modify: `src/data/initialData.js`

**Interfaces:**
- Consumes: `supabase` de `src/lib/supabaseClient.js`.
- Produces:
  - `uploadPortfolioCv(file: File, userId: string, portfolioId: string): Promise<string>` — sube el archivo, devuelve la URL pública con cache-busting, o lanza `Error` con mensaje en español.
  - `deletePortfolioCv(userId: string, portfolioId: string): void` — fire-and-forget.
  - `content.cvUrl` (string, default `''`) en la sección `contact` de portfolios nuevos. Usado por las Tasks 8 y 9.

- [ ] **Step 1: Crear `src/lib/cvUpload.js`**

```js
import { supabase } from './supabaseClient.js';

const BUCKET = 'cvs';
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function uploadPortfolioCv(file, userId, portfolioId) {
  if (file.type !== 'application/pdf') {
    throw new Error('El CV debe ser un archivo PDF.');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('El CV supera el límite de 10MB.');
  }

  const path = `${userId}/${portfolioId}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) {
    throw new Error('No se pudo subir el CV. Intenta de nuevo.');
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // El path es fijo por portfolio (upsert sobrescribe) — se agrega un parámetro de
  // versión para evitar que el navegador/CDN sirva el PDF anterior en caché.
  return `${data.publicUrl}?v=${Date.now()}`;
}

export function deletePortfolioCv(userId, portfolioId) {
  const path = `${userId}/${portfolioId}.pdf`;
  supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}
```

- [ ] **Step 2: Agregar `cvUrl` a `getInitialData()` en `src/data/initialData.js`**

Localizar el bloque de la sección `contact` (busca `id: 'contact'`) y reemplazar:

```js
      {
        id: 'contact', type: 'contact', enabled: true, variant: 'default',
        content: {
          email: '',
          links: [
            { id: uid(), label: 'GitHub', url: '' },
            { id: uid(), label: 'LinkedIn', url: '' },
          ],
        },
      },
```

por:

```js
      {
        id: 'contact', type: 'contact', enabled: true, variant: 'default',
        content: {
          email: '',
          cvUrl: '',
          links: [
            { id: uid(), label: 'GitHub', url: '' },
            { id: uid(), label: 'LinkedIn', url: '' },
          ],
        },
      },
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/lib/cvUpload.js src/data/initialData.js
git commit -m "feat: add CV upload helpers and cvUrl field"
```

---

## Task 8: Subida de CV en `ContactForm.jsx`

**Files:**
- Modify: `src/components/admin/forms/ContactForm.jsx`
- Modify: `src/components/admin/ContentForm.jsx`
- Modify: `src/components/admin/SectionsContentTab.jsx`
- Modify: `src/pages/EditorPage.jsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `uploadPortfolioCv`, `deletePortfolioCv` de `src/lib/cvUpload.js` (Task 7); `useAuth` de `src/context/AuthContext.jsx`.
- Produces: prop `portfolioId` propagada desde `EditorPage` hasta `ContactForm`; `content.cvUrl` actualizado por la UI, consumido por la Task 9 (`ContactBlock.jsx`).

- [ ] **Step 1: Propagar `portfolioId` desde `EditorPage.jsx`**

En `src/pages/EditorPage.jsx`, dentro de `<SectionsContentTab ... />`, agregar la prop `portfolioId={id}`:

```jsx
            <SectionsContentTab
              sections={portfolio.sections}
              onToggle={toggleSection}
              onMove={moveSection}
              onUpdateContent={updateSectionContent}
              portfolioId={id}
            />
```

- [ ] **Step 2: Propagar `portfolioId` en `SectionsContentTab.jsx`**

Cambiar la firma y el uso de `ContentForm`:

```jsx
export default function SectionsContentTab({ sections, onToggle, onMove, onUpdateContent, portfolioId }) {
```

y donde se renderiza `<ContentForm section={s} onChange={(next) => onUpdateContent(s.id, next)} />`, agregar `portfolioId={portfolioId}`:

```jsx
                  <ContentForm section={s} onChange={(next) => onUpdateContent(s.id, next)} portfolioId={portfolioId} />
```

- [ ] **Step 3: Propagar `portfolioId` en `ContentForm.jsx`**

Archivo completo:

```jsx
import HeroForm from './forms/HeroForm.jsx';
import AboutForm from './forms/AboutForm.jsx';
import ProjectsForm from './forms/ProjectsForm.jsx';
import SkillsForm from './forms/SkillsForm.jsx';
import ExperienceForm from './forms/ExperienceForm.jsx';
import ContactForm from './forms/ContactForm.jsx';

export default function ContentForm({ section, onChange, portfolioId }) {
  switch (section.type) {
    case 'hero': return <HeroForm content={section.content} variant={section.variant} onChange={onChange} />;
    case 'about': return <AboutForm content={section.content} onChange={onChange} />;
    case 'projects': return <ProjectsForm content={section.content} onChange={onChange} />;
    case 'skills': return <SkillsForm content={section.content} onChange={onChange} />;
    case 'experience': return <ExperienceForm content={section.content} onChange={onChange} />;
    case 'contact': return <ContactForm content={section.content} onChange={onChange} portfolioId={portfolioId} />;
    default: return null;
  }
}
```

- [ ] **Step 4: Agregar la UI de subida de CV en `ContactForm.jsx`**

Archivo completo:

```jsx
import { useRef, useState } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import Field from '../Field.jsx';
import { uid } from '../../../utils/uid.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { uploadPortfolioCv, deletePortfolioCv } from '../../../lib/cvUpload.js';

export default function ContactForm({ content, onChange, portfolioId }) {
  const { user } = useAuth();
  const links = content.links;
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvError, setCvError] = useState('');
  const cvInputRef = useRef(null);

  const updateLink = (id, patch) => onChange({ ...content, links: links.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const addLink = () => onChange({ ...content, links: [...links, { id: uid(), label: '', url: '' }] });
  const removeLink = (id) => onChange({ ...content, links: links.filter((l) => l.id !== id) });

  const handleCvChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setCvError('');
    setUploadingCv(true);
    try {
      const url = await uploadPortfolioCv(file, user.id, portfolioId);
      onChange({ ...content, cvUrl: url });
    } catch (err) {
      setCvError(err.message);
    } finally {
      setUploadingCv(false);
    }
  };

  const handleRemoveCv = () => {
    deletePortfolioCv(user.id, portfolioId);
    onChange({ ...content, cvUrl: '' });
  };

  return (
    <div className="adm-form-grid">
      <Field label="Email"><input className="adm-input" value={content.email} onChange={(e) => onChange({ ...content, email: e.target.value })} /></Field>
      <Field label="CV (PDF)">
        <div className="adm-cv-upload">
          {content.cvUrl ? (
            <>
              <a className="adm-cv-upload-name" href={content.cvUrl} target="_blank" rel="noreferrer"><FileText size={14} /> CV subido</a>
              <button type="button" className="adm-image-upload-remove" onClick={handleRemoveCv} aria-label="Quitar CV"><Trash2 size={14} /></button>
            </>
          ) : (
            <button type="button" className="adm-image-upload-btn" onClick={() => cvInputRef.current.click()} disabled={uploadingCv}>
              {uploadingCv ? 'Subiendo…' : 'Subir CV'}
            </button>
          )}
          <input ref={cvInputRef} type="file" accept="application/pdf" hidden onChange={handleCvChange} />
        </div>
        {cvError && <span className="adm-image-upload-error">{cvError}</span>}
      </Field>
      <div className="adm-list-editor">
        {links.map((l) => (
          <div key={l.id} className="adm-list-item adm-list-item-row">
            <input className="adm-input" style={{ flex: 1 }} placeholder="Etiqueta" value={l.label} onChange={(e) => updateLink(l.id, { label: e.target.value })} />
            <input className="adm-input" style={{ flex: 2 }} placeholder="https://..." value={l.url} onChange={(e) => updateLink(l.id, { url: e.target.value })} />
            <button type="button" className="adm-remove-btn" onClick={() => removeLink(l.id)} aria-label="Eliminar link"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className="adm-add-btn" onClick={addLink}><Plus size={14} /> Agregar red</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Agregar estilos en `src/styles/global.css`**

Localizar con `grep -n "adm-image-upload-error" src/styles/global.css` (la última regla de ese bloque). Insertar justo después:

```css
.adm-cv-upload { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.adm-cv-upload-name {
  display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--a-text);
  text-decoration: underline; text-decoration-color: var(--a-border);
}
.adm-cv-upload-name:hover { color: var(--a-accent); }
```

- [ ] **Step 6: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 7: Verificación manual en el navegador**

Run: `npm run dev`, abrir `/editor/<id>` → pestaña Secciones → Contacto.

Expected:
- Aparece el campo "CV (PDF)" con botón "Subir CV" debajo de Email.
- Subir un PDF < 10MB: el botón dice "Subiendo…", luego aparece el link "CV subido" y el indicador de guardado del editor pasa a "Guardando…/Guardado hace Xm".
- Intentar subir un archivo que no sea PDF o mayor a 10MB: aparece el mensaje de error inline, no cambia el estado.
- Click en el ícono de basura: vuelve a mostrar el botón "Subir CV".

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/forms/ContactForm.jsx src/components/admin/ContentForm.jsx src/components/admin/SectionsContentTab.jsx src/pages/EditorPage.jsx src/styles/global.css
git commit -m "feat: add CV upload UI to contact form"
```

---

## Task 9: Tracking y descarga de CV en `ContactBlock.jsx`

**Files:**
- Modify: `src/components/public/ContactBlock.jsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: prop `onTrack` (Task 6), `content.cvUrl` (Task 7).

- [ ] **Step 1: Actualizar `ContactBlock.jsx`**

Archivo completo:

```jsx
export default function ContactBlock({ content, onTrack = () => {} }) {
  return (
    <section className="pf-section pf-contact">
      <p className="pf-eyebrow">// contacto</p>
      <h2 className="pf-contact-heading">Hablemos</h2>
      {content.email && (
        <a
          className="pf-contact-email"
          href={`mailto:${content.email}`}
          onClick={() => onTrack('contact_click', { target_id: 'email', target_label: content.email })}
        >
          {content.email}
        </a>
      )}
      {content.cvUrl && (
        <a
          className="pf-cv-download"
          href={content.cvUrl}
          download
          onClick={() => onTrack('cv_click', { target_label: 'CV' })}
        >
          Descargar CV
        </a>
      )}
      {content.links && content.links.length > 0 && (
        <div className="pf-contact-links">
          {content.links.map((l) => (
            <a
              key={l.id}
              className="pf-contact-link"
              href={l.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => onTrack('contact_click', { target_id: l.id, target_label: l.label })}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Agregar estilos para el botón de CV**

Localizar con `grep -n "\.pf-contact-links {" src/styles/global.css`. Insertar justo después de esa línea (antes de `.pf-contact-link`):

```css
.pf-cv-download {
  display: inline-block; font-family: var(--font-mono); font-size: 13px; padding: 9px 16px;
  border-radius: 999px; border: 1px solid var(--p-accent); color: var(--p-accent); text-decoration: none;
  margin-top: 10px;
}
.pf-cv-download:hover { background: var(--p-accent-soft); }
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificación manual en el navegador**

Run: `npm run dev`. Con un portfolio que ya tiene `cvUrl` (de la Task 8), abrir `/p/<slug>`.

Expected:
- Aparece el botón "Descargar CV" entre el email y los links de redes.
- Click en el botón: el navegador descarga el PDF real (no solo lo abre) — confirmar en la carpeta de descargas del navegador.
- Confirmar con `execute_sql` (`select event_type, target_label from portfolio_events where portfolio_id = '<id>' and event_type = 'cv_click';`) que se registró el evento.
- Click en el email y en un link de red: confirmar eventos `contact_click` con el `target_label` correcto.

- [ ] **Step 5: Commit**

```bash
git add src/components/public/ContactBlock.jsx src/styles/global.css
git commit -m "feat: track contact/CV clicks and add real CV download"
```

---

## Task 10: Tracking de clics en proyectos

**Files:**
- Modify: `src/components/public/ProjectsGrid.jsx`
- Modify: `src/components/public/ProjectsList.jsx`

**Interfaces:**
- Consumes: prop `onTrack` (Task 6).

- [ ] **Step 1: Actualizar `ProjectsGrid.jsx`**

Archivo completo:

```jsx
import { getImageFrameStyle } from '../../utils/imageFrameStyle.js';

export default function ProjectsGrid({ content, onTrack = () => {} }) {
  return (
    <section className="pf-section pf-projects">
      <p className="pf-eyebrow">// proyectos</p>
      <h2 className="pf-projects-heading">Proyectos</h2>
      <div className="pf-projects-grid">
        {content.items.map((p) => {
          const pos = p.imagePosition || { x: 50, y: 50 };
          const zoom = p.imageZoom || 1;
          return (
            <article key={p.id} className="pf-project-card">
              {p.imageUrl && (
                <div className="pf-project-image-frame">
                  <img
                    src={p.imageUrl}
                    alt={p.title || 'Proyecto'}
                    className="pf-project-image"
                    style={getImageFrameStyle(pos, zoom)}
                  />
                </div>
              )}
              <h3 className="pf-project-title">{p.title || 'Proyecto'}</h3>
              {p.description && <p className="pf-project-desc">{p.description}</p>}
              {p.stack && (
                <div className="pf-project-stack">
                  {p.stack.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                    <span key={i} className="pf-tag">{s}</span>
                  ))}
                </div>
              )}
              {p.url && (
                <a
                  className="pf-project-link"
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onTrack('project_click', { target_id: p.id, target_label: p.title || 'Proyecto' })}
                >
                  Ver proyecto →
                </a>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Actualizar `ProjectsList.jsx`**

Archivo completo:

```jsx
import { getImageFrameStyle } from '../../utils/imageFrameStyle.js';

export default function ProjectsList({ content, onTrack = () => {} }) {
  return (
    <section className="pf-section pf-projects">
      <p className="pf-eyebrow">// proyectos</p>
      <h2 className="pf-projects-heading">Proyectos</h2>
      <div className="pf-projects-list">
        {content.items.map((p, i) => {
          const pos = p.imagePosition || { x: 50, y: 50 };
          const zoom = p.imageZoom || 1;
          return (
            <div key={p.id} className="pf-project-row">
              <span className="pf-project-index">{String(i + 1).padStart(2, '0')}</span>
              <div>
                {p.imageUrl && (
                  <div className="pf-project-image-frame">
                    <img
                      src={p.imageUrl}
                      alt={p.title || 'Proyecto'}
                      className="pf-project-image"
                      style={getImageFrameStyle(pos, zoom)}
                    />
                  </div>
                )}
                <h3 className="pf-project-title">{p.title || 'Proyecto'}</h3>
                {p.description && <p className="pf-project-desc">{p.description}</p>}
                {p.stack && (
                  <div className="pf-project-stack">
                    {p.stack.split(',').map((s) => s.trim()).filter(Boolean).map((s, i2) => (
                      <span key={i2} className="pf-tag">{s}</span>
                    ))}
                  </div>
                )}
                {p.url && (
                  <a
                    className="pf-project-link"
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onTrack('project_click', { target_id: p.id, target_label: p.title || 'Proyecto' })}
                  >
                    Ver proyecto →
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificación manual en el navegador**

Run: `npm run dev`. En `/p/<slug>` de un portfolio con al menos un proyecto con link, hacer clic en "Ver proyecto →".

Expected: se abre el link en pestaña nueva y se registra un evento `project_click` con el `target_label` correcto (verificar con `execute_sql`).

- [ ] **Step 5: Commit**

```bash
git add src/components/public/ProjectsGrid.jsx src/components/public/ProjectsList.jsx
git commit -m "feat: track project link clicks"
```

---

## Task 11: `AnalyticsPage.jsx` y ruta `/analytics/:id`

**Files:**
- Create: `src/pages/AnalyticsPage.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: RPCs de la Task 2 (`get_portfolio_overview`, `get_portfolio_daily_trend`, `get_portfolio_funnel`, `get_portfolio_top_projects`, `get_portfolio_referrers`, `get_portfolio_geo`, `get_portfolio_devices`); `StatCard`, `AppSidebar`, `ThemeToggle` (ya existen).
- Produces: ruta `/analytics/:id`, usada por la Task 12 (`DashboardPage.jsx`).

- [ ] **Step 1: Crear `src/pages/AnalyticsPage.jsx`**

```jsx
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '../components/admin/ThemeToggle.jsx';
import AppSidebar from '../components/admin/AppSidebar.jsx';
import StatCard from '../components/admin/StatCard.jsx';

const RANGE_OPTIONS = [
  { label: '7 días', value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
];

const FUNNEL_LABELS = {
  view: 'Vistas',
  scroll_50: 'Scroll 50%',
  project_click: 'Clic en proyecto',
  contact_or_cv: 'Clic en contacto/CV',
};

const PIE_COLORS = ['#D97757', '#8A8272', '#4C6E5D', '#B84C3A'];

export default function AnalyticsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [topProjects, setTopProjects] = useState([]);
  const [referrers, setReferrers] = useState([]);
  const [geo, setGeo] = useState([]);
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, title')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (cancelled) return;
      if (error || !data) {
        navigate('/dashboard', { replace: true });
        return;
      }
      setPortfolio(data);
      setLoadState('ready');
    })();
    return () => { cancelled = true; };
  }, [id, user.id, navigate]);

  const fetchStats = useCallback(async () => {
    setError('');
    const [
      overviewRes, trendRes, funnelRes, topProjectsRes, referrersRes, geoRes, devicesRes,
    ] = await Promise.all([
      supabase.rpc('get_portfolio_overview', { p_portfolio_id: id, p_days: days }),
      supabase.rpc('get_portfolio_daily_trend', { p_portfolio_id: id, p_days: days }),
      supabase.rpc('get_portfolio_funnel', { p_portfolio_id: id, p_days: days }),
      supabase.rpc('get_portfolio_top_projects', { p_portfolio_id: id, p_days: days }),
      supabase.rpc('get_portfolio_referrers', { p_portfolio_id: id, p_days: days }),
      supabase.rpc('get_portfolio_geo', { p_portfolio_id: id, p_days: days }),
      supabase.rpc('get_portfolio_devices', { p_portfolio_id: id, p_days: days }),
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
    setDevices(devicesRes.data || []);
  }, [id, days]);

  useEffect(() => {
    if (loadState === 'ready') fetchStats();
  }, [loadState, fetchStats]);

  if (loadState === 'loading') return <div className="adm-shell adm-loading-screen">Cargando…</div>;

  const totalViews = overview ? Number(overview.total_views) : 0;
  const isEmpty = totalViews === 0;
  const funnelMax = funnel.reduce((max, f) => Math.max(max, Number(f.sessions)), 0) || 1;

  return (
    <div className="dash-shell adm-shell">
      <AppSidebar />
      <div className="dash-content">
        <header className="dash-topbar">
          <ThemeToggle />
        </header>
        <main className="dash-main an-main">
          <Link to="/dashboard" className="adm-btn-ghost"><ArrowLeft size={14} /> Volver al panel</Link>
          <div className="dash-main-head">
            <div>
              <h1 className="adm-panel-title">Analytics — {portfolio.title}</h1>
              <p className="adm-panel-desc">Métricas de visitas de tu portfolio publicado.</p>
            </div>
            <div className="adm-segmented">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={days === opt.value ? 'is-active' : ''}
                  onClick={() => setDays(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="adm-error">{error}</p>}

          {isEmpty ? (
            <p className="adm-empty" style={{ marginTop: 20 }}>Todavía no hay datos para este rango.</p>
          ) : (
            <>
              <div className="dash-stats">
                <StatCard label="Vistas totales" value={totalViews} />
                <StatCard label="Visitantes únicos" value={overview ? Number(overview.unique_visitors) : 0} />
                <StatCard label="Tiempo promedio" value={overview && overview.avg_seconds_on_page ? `${Math.round(overview.avg_seconds_on_page)}s` : '—'} />
                <StatCard label="Clic a contacto" value={overview ? `${overview.contact_ctr}%` : '0%'} />
              </div>

              <section className="an-panel">
                <h2 className="an-panel-title">Tendencia de vistas</h2>
                <div className="pf-chart-wrap" style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="views" stroke="#D97757" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="an-panel">
                <h2 className="an-panel-title">Funnel</h2>
                <div className="an-funnel">
                  {funnel.map((f) => (
                    <div key={f.stage} className="an-funnel-row">
                      <span className="an-funnel-label">{FUNNEL_LABELS[f.stage] || f.stage}</span>
                      <div className="an-funnel-bar-track">
                        <div className="an-funnel-bar" style={{ width: `${(Number(f.sessions) / funnelMax) * 100}%` }} />
                      </div>
                      <span className="an-funnel-value">{f.sessions}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="an-grid-2">
                <div className="an-panel">
                  <h2 className="an-panel-title">Top proyectos</h2>
                  {topProjects.length === 0 ? <p className="adm-empty">Sin clics todavía.</p> : (
                    <table className="an-table">
                      <tbody>
                        {topProjects.map((p) => (
                          <tr key={p.target_label}>
                            <td>{p.target_label}</td>
                            <td className="an-table-value">{p.clicks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="an-panel">
                  <h2 className="an-panel-title">Dispositivos</h2>
                  <div className="pf-chart-wrap" style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={devices} dataKey="visits" nameKey="device_type" innerRadius={40} outerRadius={70}>
                          {devices.map((d, i) => <Cell key={d.device_type} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              <section className="an-grid-2">
                <div className="an-panel">
                  <h2 className="an-panel-title">Referrers</h2>
                  {referrers.length === 0 ? <p className="adm-empty">Sin datos todavía.</p> : (
                    <ul className="an-list">
                      {referrers.map((r) => (
                        <li key={r.referrer_domain}><span>{r.referrer_domain}</span><span>{r.visits}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="an-panel">
                  <h2 className="an-panel-title">Países</h2>
                  {geo.length === 0 ? <p className="adm-empty">Sin datos todavía.</p> : (
                    <ul className="an-list">
                      {geo.map((g) => (
                        <li key={g.country}><span>{g.country}</span><span>{g.visits}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Registrar la ruta en `src/App.jsx`**

Archivo completo:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EditorPage from './pages/EditorPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import PublicPortfolioPage from './pages/PublicPortfolioPage.jsx';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="adm-shell adm-loading-screen">Cargando…</div>;
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/editor/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
            <Route path="/analytics/:id" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/p/:slug" element={<PublicPortfolioPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 3: Agregar estilos en `src/styles/global.css`**

Localizar con `grep -n "^\.adm-stat-hint" src/styles/global.css` (línea `.adm-stat-hint { font-size: 11.5px; color: var(--a-muted); }`, justo antes del comentario `/* ---------- Public portfolio render ---------- */`). Insertar después de esa línea:

```css
.an-main > .adm-btn-ghost { margin-bottom: 14px; }
.an-panel {
  border: 1px solid var(--a-border); border-radius: 12px; padding: 18px; background: var(--a-panel);
  margin-bottom: 20px;
}
.an-panel-title { font-family: var(--font-display); font-size: 15px; margin: 0 0 14px; color: var(--a-text); }
.an-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
.an-grid-2 .an-panel { margin-bottom: 0; }
.an-funnel { display: flex; flex-direction: column; gap: 10px; }
.an-funnel-row { display: grid; grid-template-columns: 130px 1fr 40px; align-items: center; gap: 10px; }
.an-funnel-label { font-size: 12.5px; color: var(--a-muted); }
.an-funnel-bar-track { height: 10px; border-radius: 999px; background: var(--a-bg); overflow: hidden; }
.an-funnel-bar { height: 100%; background: var(--a-accent); border-radius: 999px; }
.an-funnel-value { font-size: 12.5px; color: var(--a-text); text-align: right; font-family: var(--font-mono); }
.an-table { width: 100%; border-collapse: collapse; }
.an-table td { padding: 8px 0; font-size: 13px; color: var(--a-text); border-bottom: 1px solid var(--a-border); }
.an-table tr:last-child td { border-bottom: none; }
.an-table-value { text-align: right; font-family: var(--font-mono); color: var(--a-muted); }
.an-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.an-list li { display: flex; justify-content: space-between; font-size: 13px; color: var(--a-text); }
.an-list li span:last-child { font-family: var(--font-mono); color: var(--a-muted); }
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 5: Verificación manual en el navegador**

Run: `npm run dev`. Con sesión iniciada, navegar directamente a `/analytics/<id>` de un portfolio propio que ya tenga eventos (de las Tasks 6, 9, 10).

Expected:
- Se ven las 4 `StatCard`, el gráfico de tendencia, el funnel, el top de proyectos, el gráfico de dispositivos, referrers y países, todos reflejando los eventos generados en pruebas anteriores.
- Cambiar el selector de rango (7/30/90 días): los datos se refiltran (confirmar visualmente que el gráfico de tendencia cambia si hay eventos fuera del rango de 7 días).
- Navegar a `/analytics/<id-de-un-portfolio-ajeno>` (id de otro usuario, si existe alguno de prueba) o a un id inexistente: redirige a `/dashboard`.
- Un portfolio publicado sin ningún evento: muestra "Todavía no hay datos para este rango." en vez de gráficos vacíos.

- [ ] **Step 6: Commit**

```bash
git add src/pages/AnalyticsPage.jsx src/App.jsx src/styles/global.css
git commit -m "feat: add per-portfolio analytics dashboard page"
```

---

## Task 12: Botón "Ver analytics" en `DashboardPage.jsx`

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

**Interfaces:**
- Consumes: ruta `/analytics/:id` (Task 11).

- [ ] **Step 1: Agregar el botón en cada tarjeta de portfolio publicado**

En `src/pages/DashboardPage.jsx`, agregar `BarChart2` al import de `lucide-react`:

```jsx
import { Plus, Trash2, Pencil, ExternalLink, LogOut, BarChart2 } from 'lucide-react';
```

Y en el bloque `.dash-card-actions`, agregar el botón justo después del de "Editar" (antes del link "Ver publicado"):

```jsx
                <div className="dash-card-actions">
                  <button type="button" className="adm-btn-ghost" onClick={() => navigate(`/editor/${p.id}`)}>
                    <Pencil size={14} /> Editar
                  </button>
                  {p.published && (
                    <button type="button" className="adm-btn-ghost" onClick={() => navigate(`/analytics/${p.id}`)}>
                      <BarChart2 size={14} /> Analytics
                    </button>
                  )}
                  {p.published && (
                    <a className="adm-btn-ghost" href={`/p/${p.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button type="button" className="adm-btn-ghost" onClick={() => handleDelete(p.id)} aria-label="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 3: Verificación manual en el navegador**

Run: `npm run dev`, abrir `/dashboard`.

Expected:
- Cada tarjeta de un portfolio publicado muestra un botón "Analytics" entre "Editar" y el ícono de link externo.
- Un portfolio sin publicar no muestra el botón "Analytics".
- Click en "Analytics": navega a `/analytics/<id>` y carga la página de la Task 11.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: link to analytics page from dashboard cards"
```

---

## Self-Review Notes

- **Cobertura del spec:**
  - Sección 1 (tabla `portfolio_events` + RLS) → Task 1.
  - Sección 2 (Edge Function `track-event`, `src/lib/tracking.js`, wiring en página pública/proyectos/contacto) → Tasks 4, 5, 6, 9, 10.
  - Sección 3 (CV — Storage, `cvUpload.js`, UI en `ContactForm`, descarga en `ContactBlock`) → Tasks 3, 7, 8, 9.
  - Sección 5 (RPCs de agregación) → Task 2.
  - Sección 6 (`AnalyticsPage.jsx`, ruta, botón en Dashboard) → Tasks 11, 12.
  - "Manejo de errores" del spec (geo best-effort, tracking fire-and-forget, CV validación inline, RPC parcial) → cubierto en Task 4 (`lookupGeo` con timeout), Task 5 (`trackEvent` con `.catch(() => {})`), Task 7/8 (validación de tipo/tamaño antes de subir), Task 11 (`anyError` muestra un solo mensaje sin bloquear las secciones que sí cargaron).
  - "Testing / verificación" del spec → pasos de verificación manual en cada task correspondiente.
- **Placeholders:** ninguno — todo el código de cada step es completo (archivo entero o fragmento con contexto exacto de inserción vía `grep -n`).
- **Consistencia de tipos/nombres:**
  - `trackEvent(portfolioId, eventType, extra)` (Task 5) se usa con esa misma firma en Tasks 6, 9, 10 vía la prop `onTrack` (que internamente llama `trackEvent(portfolioIdRef.current, eventType, extra)`).
  - Columnas de `portfolio_events` (Task 1) coinciden exactamente con los campos insertados por la Edge Function (Task 4) y con los nombres leídos por los RPCs (Task 2).
  - Parámetros de los RPCs (`p_portfolio_id`, `p_days`) coinciden entre la definición SQL (Task 2) y las llamadas `supabase.rpc(...)` en `AnalyticsPage.jsx` (Task 11).
  - `uploadPortfolioCv(file, userId, portfolioId): Promise<string>` y `deletePortfolioCv(userId, portfolioId): void` (Task 7) se usan con esa misma firma en `ContactForm.jsx` (Task 8).
  - `content.cvUrl` introducido en Task 7 (`initialData.js`) es el mismo nombre leído en Task 8 (`ContactForm`) y Task 9 (`ContactBlock`).
  - Prop `onTrack` de `PortfolioRenderer` (Task 6) coincide con la prop consumida por `ContactBlock`, `ProjectsGrid`, `ProjectsList` (Tasks 9, 10), todas con default `() => {}`.
