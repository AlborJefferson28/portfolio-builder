# Pulido del sistema visual: Dashboard y Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar `DashboardPage` y `EditorPage` al nivel de pulido visual de `LoginPage`: tokens de sombra/motion compartidos, transiciones consistentes, auditoría de dark mode, modal con entrada animada y auto-focus, y un nuevo layout de Dashboard con sidebar + stat cards (portfolios activos y vistas totales, con tracking real).

**Architecture:** Todo el trabajo vive en `src/styles/global.css` (extensión del sistema `--a-*` ya establecido) más dos componentes nuevos (`StatCard`, `AppSidebar`) y cambios puntuales en `PublishModal.jsx`, `PublicPortfolioPage.jsx` y `DashboardPage.jsx`. El tracking de vistas agrega una columna `views` y una función RPC `security definer` en Supabase (proyecto `portfolio-builder`, id `dzannfaklwjhmkoauokq`).

**Tech Stack:** React 18 + Vite, CSS plano (sin librerías nuevas — no se agrega Framer Motion ni ninguna dependencia), `@supabase/supabase-js`, `lucide-react`.

## Global Constraints

- No hay framework de testing en el proyecto (confirmado en `package.json`). Verificación de cada tarea: `npm run build` debe pasar sin errores, y donde aplique, revisión manual en `npm run dev`.
- No se agregan dependencias nuevas — YAGNI explícito en el spec (se descartó Framer Motion para el indicador de tabs).
- Todo el copy de UI está en español, como el resto del proyecto.
- Los tokens nuevos siguen la convención de nombres existente: prefijo `--a-*` para el panel admin (ver `2026-08-11-admin-theme-unification-design.md`), no se toca el prefijo `--p-*` del portfolio público ni `--av-*` del login.
- Componentes nuevos van en `src/components/admin/` (mismo directorio que `ThemeToggle.jsx`, `Toggle.jsx`, etc.), siguiendo el patrón de componentes funcionales sin clases.
- Fuera de alcance (explícito en el spec, no implementar): Storage Used / subida de archivos, drag-and-drop de secciones o proyectos, páginas funcionales de Analytics/Templates/Settings, perfil de usuario con avatar/plan.

---

## Task 1: Tokens de sombra y motion + auditoría de contraste dark

**Files:**
- Modify: `src/styles/global.css:13-18` (bloque `.adm-shell`)
- Modify: `src/styles/global.css:549-557` (bloque `html[data-admin-theme="dark"] .adm-shell`)

**Interfaces:**
- Produces: variables CSS `--a-panel-2`, `--a-shadow-sm`, `--a-shadow-md`, `--a-shadow-lg`, `--a-ease`, `--a-duration-fast`, `--a-duration-base`, disponibles en cualquier regla dentro de `.adm-shell` (light) con overrides en `html[data-admin-theme="dark"] .adm-shell` (dark). Usadas por las Tasks 2, 3, 7, 8, 9.

- [ ] **Step 1: Agregar tokens al bloque light de `.adm-shell`**

Reemplazar (líneas 13-18):

```css
.adm-shell {
  --a-bg: #FAF8F4; --a-panel: #FFFFFF; --a-border: #E7E2D8; --a-text: #262019;
  --a-muted: #8A8272; --a-accent: #D97757; --a-accent-contrast: #FFFFFF;
  min-height: 100vh; background: var(--a-bg); color: var(--a-text);
  font-family: var(--font-body); display: flex; flex-direction: column;
}
```

por:

```css
.adm-shell {
  --a-bg: #FAF8F4; --a-panel: #FFFFFF; --a-border: #E7E2D8; --a-text: #262019;
  --a-muted: #8A8272; --a-accent: #D97757; --a-accent-contrast: #FFFFFF;
  --a-panel-2: #F1ECE3;
  --a-shadow-sm: 0 1px 3px rgba(38,32,25,0.08);
  --a-shadow-md: 0 8px 20px rgba(38,32,25,0.08);
  --a-shadow-lg: 0 20px 50px rgba(38,32,25,0.16);
  --a-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --a-duration-fast: 150ms;
  --a-duration-base: 220ms;
  min-height: 100vh; background: var(--a-bg); color: var(--a-text);
  font-family: var(--font-body); display: flex; flex-direction: column;
}
```

- [ ] **Step 2: Agregar tokens dark al bloque `html[data-admin-theme="dark"] .adm-shell`**

Reemplazar (líneas 549-557):

```css
html[data-admin-theme="dark"] .adm-shell {
  --a-bg: #181818;
  --a-panel: #212121;
  --a-border: #333333;
  --a-text: #EDEDED;
  --a-muted: #9A9A9A;
  --a-accent: #D97757;
  --a-accent-contrast: #FFFFFF;
}
```

por:

```css
html[data-admin-theme="dark"] .adm-shell {
  --a-bg: #181818;
  --a-panel: #212121;
  --a-border: #333333;
  --a-text: #EDEDED;
  --a-muted: #9A9A9A;
  --a-accent: #D97757;
  --a-accent-contrast: #FFFFFF;
  --a-panel-2: #2A2A2A;
  --a-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --a-shadow-md: 0 8px 20px rgba(0,0,0,0.35);
  --a-shadow-lg: 0 20px 50px rgba(0,0,0,0.5);
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build termina sin errores (los tokens son solo CSS, no hay lógica que pueda romperse).

- [ ] **Step 4: Auditoría de contraste dark (verificación, sin cambio de código)**

Calcular la razón de contraste WCAG entre `--a-muted` (#9A9A9A) y las dos superficies donde se usa como texto: `--a-panel` (#212121) y `--a-panel-2` (#2A2A2A, nuevo).

Usando la fórmula de luminancia relativa de WCAG:
- `#9A9A9A` → luminancia ≈ 0.3224
- `#212121` → luminancia ≈ 0.01523 → contraste con `--a-muted` ≈ **5.71:1**
- `#2A2A2A` → luminancia ≈ 0.02318 → contraste con `--a-muted` ≈ **5.09:1**

Ambos superan el umbral AA de texto normal (4.5:1) — no se requiere ajustar `--a-muted` ni `--a-panel-2`. Confirmar visualmente con `npm run dev`: abrir `/dashboard` con el toggle en modo oscuro (botón sol/luna del header) y verificar a simple vista que las etiquetas en gris (`adm-panel-desc`, `dash-card-meta`) se leen con comodidad sobre el fondo oscuro. Si algo se ve ilegible pese al cálculo, ajustar `--a-muted` en el bloque dark en este mismo step antes de continuar.

No se encontraron cambios necesarios — este step es de verificación, no agrega commit propio (se incluye en el commit del Step 5).

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add shared shadow/motion tokens and audit dark contrast"
```

---

## Task 2: Motion — hover de `dash-card` y entrada animada del modal

**Files:**
- Modify: `src/styles/global.css:142-146` (`.adm-preview-frame`)
- Modify: `src/styles/global.css:151-158` (`.adm-modal-overlay`, `.adm-modal`)
- Modify: `src/styles/global.css:437-440` (`.dash-card`)
- Modify: `src/components/admin/PublishModal.jsx`

**Interfaces:**
- Consumes: `--a-shadow-sm/md/lg`, `--a-ease`, `--a-duration-base` (Task 1).
- Produces: clase CSS `.is-entered` aplicada a `.adm-modal-overlay`/`.adm-modal` para disparar la transición de entrada — patrón reutilizado por cualquier modal futuro (documentado en el spec, Fase 4).

- [ ] **Step 1: Reemplazar sombras hardcodeadas por los tokens de Task 1**

En `.adm-preview-frame` (líneas 142-146), reemplazar:

```css
.adm-preview-frame {
  width: 100%; max-width: 900px; border: 1px solid var(--a-border); border-radius: 14px;
  overflow: hidden; background: #fff; max-height: 640px; overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0,0,0,0.06);
}
```

por:

```css
.adm-preview-frame {
  width: 100%; max-width: 900px; border: 1px solid var(--a-border); border-radius: 14px;
  overflow: hidden; background: #fff; max-height: 640px; overflow-y: auto;
  box-shadow: var(--a-shadow-md);
}
```

- [ ] **Step 2: Agregar transición de entrada al modal**

Reemplazar (líneas 151-158):

```css
.adm-modal-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex;
  align-items: center; justify-content: center; padding: 20px; z-index: 50;
}
.adm-modal {
  background: var(--a-panel); border: 1px solid var(--a-border); border-radius: 14px; padding: 28px; max-width: 400px; width: 100%;
  position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.2); font-family: var(--font-body);
}
```

por:

```css
.adm-modal-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex;
  align-items: center; justify-content: center; padding: 20px; z-index: 50;
  opacity: 0; transition: opacity var(--a-duration-base) var(--a-ease);
}
.adm-modal-overlay.is-entered { opacity: 1; }
.adm-modal {
  background: var(--a-panel); border: 1px solid var(--a-border); border-radius: 14px; padding: 28px; max-width: 400px; width: 100%;
  position: relative; box-shadow: var(--a-shadow-lg); font-family: var(--font-body);
  opacity: 0; transform: scale(0.97);
  transition: opacity var(--a-duration-base) var(--a-ease), transform var(--a-duration-base) var(--a-ease);
}
.adm-modal.is-entered { opacity: 1; transform: scale(1); }
```

- [ ] **Step 3: Agregar hover a `.dash-card`**

Reemplazar (líneas 437-440):

```css
.dash-card {
  border: 1px solid var(--a-border); border-radius: 12px; padding: 18px; background: var(--a-panel);
  display: flex; flex-direction: column; gap: 8px;
}
```

por:

```css
.dash-card {
  border: 1px solid var(--a-border); border-radius: 12px; padding: 18px; background: var(--a-panel);
  display: flex; flex-direction: column; gap: 8px;
  transition: transform var(--a-duration-base) var(--a-ease), box-shadow var(--a-duration-base) var(--a-ease);
}
.dash-card:hover { transform: translateY(-2px); box-shadow: var(--a-shadow-md); }
```

- [ ] **Step 4: Aplicar `is-entered` en `PublishModal.jsx`**

En `src/components/admin/PublishModal.jsx`, agregar el import de `useEffect` (ya está importado) y un estado `entered`. Reemplazar el bloque de imports y el inicio del componente:

```jsx
import { useState, useEffect } from 'react';
import { Copy, ExternalLink, X } from 'lucide-react';
import Field from './Field.jsx';

export default function PublishModal({ open, onClose, defaultSlug, publishedSlug, onConfirm }) {
  const [slug, setSlug] = useState(defaultSlug);
  const [view, setView] = useState(publishedSlug ? 'success' : 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [entered, setEntered] = useState(false);
```

Agregar un nuevo `useEffect` justo después del `useEffect` que sincroniza `slug`/`view`/`error` con `open` (el que empieza en `if (open) { setSlug(...` ):

```jsx
  useEffect(() => {
    if (!open) { setEntered(false); return undefined; }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);
```

Y actualizar el JSX de retorno para aplicar la clase (reemplazar la línea del `return`):

```jsx
  return (
    <div className={`adm-modal-overlay${entered ? ' is-entered' : ''}`} onClick={onClose}>
      <div className={`adm-modal${entered ? ' is-entered' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
```

(el resto del JSX interno del modal no cambia).

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 6: Verificación manual**

Run: `npm run dev`, ir a `/dashboard`, crear o abrir un portfolio, entrar al editor y hacer click en "Publicar".
Expected: el overlay y el modal aparecen con un fade + scale suave (no de golpe). Hacer hover sobre una card del dashboard: debe elevarse levemente con sombra. Repetir con `prefers-reduced-motion` activado en las devtools del navegador (Rendering → Emulate CSS media feature) y confirmar que ambas transiciones se desactivan (por la regla global ya existente en `global.css`).

- [ ] **Step 7: Commit**

```bash
git add src/styles/global.css src/components/admin/PublishModal.jsx
git commit -m "feat: animate modal entrance and dashboard card hover"
```

---

## Task 3: Transición de `.adm-tabs`

**Files:**
- Modify: `src/styles/global.css:27-31` (`.adm-tabs button`)

**Interfaces:**
- Consumes: `--a-duration-fast`, `--a-ease` (Task 1).

- [ ] **Step 1: Agregar transición al botón de tab**

Reemplazar (líneas 27-31):

```css
.adm-tabs button {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border: none;
  background: transparent; color: var(--a-muted); font-size: 13px; font-weight: 500;
  border-radius: 7px; cursor: pointer; font-family: var(--font-body);
}
```

por:

```css
.adm-tabs button {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border: none;
  background: transparent; color: var(--a-muted); font-size: 13px; font-weight: 500;
  border-radius: 7px; cursor: pointer; font-family: var(--font-body);
  transition: background var(--a-duration-fast) var(--a-ease), color var(--a-duration-fast) var(--a-ease);
}
```

Nota: no se agrega un indicador deslizante separado (requeriría medir posiciones en JS o una librería de motion) — el cross-fade de fondo/color ya resuelve la brecha de pulido identificada en el spec (Fase 2) sin agregar dependencias, según lo decidido en el diseño.

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

Run: `npm run dev`, ir a `/editor/<id>` de un portfolio existente, hacer click entre los 4 tabs del header (Secciones/Contenido/Diseño/Vista previa).
Expected: el fondo color pill del tab activo aparece/desaparece con un fundido suave, no instantáneo.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: animate editor tabs active state transition"
```

---

## Task 4: Auto-focus en `PublishModal`

**Files:**
- Modify: `src/components/admin/PublishModal.jsx`

**Interfaces:**
- Consumes: estructura existente de `PublishModal.jsx` (Task 2 ya modificó este archivo — este task parte del resultado de esa tarea).

- [ ] **Step 1: Agregar refs y efecto de auto-focus**

Agregar `useRef` al import de React y declarar dos refs junto a los demás `useState` del componente:

```jsx
import { useState, useEffect, useRef } from 'react';
```

```jsx
  const [entered, setEntered] = useState(false);
  const slugInputRef = useRef(null);
  const successBtnRef = useRef(null);
```

Agregar un nuevo `useEffect` después del `useEffect` de `entered` (Task 2, Step 4):

```jsx
  useEffect(() => {
    if (!open || !entered) return;
    if (view === 'edit') slugInputRef.current && slugInputRef.current.focus();
    if (view === 'success') successBtnRef.current && successBtnRef.current.focus();
  }, [open, entered, view]);
```

- [ ] **Step 2: Conectar los refs a los elementos**

En el JSX, el input de slug (dentro del bloque `view === 'edit'`) pasa de:

```jsx
              <input
                className="adm-input"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              />
```

a:

```jsx
              <input
                ref={slugInputRef}
                className="adm-input"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              />
```

Y el botón "Ver portfolio publicado" (dentro del bloque `view === 'success'`) pasa de:

```jsx
              <button type="button" className="adm-btn-primary" onClick={() => window.open(shareUrl, '_blank', 'noreferrer')}>
                <ExternalLink size={14} /> Ver portfolio publicado
              </button>
```

a:

```jsx
              <button ref={successBtnRef} type="button" className="adm-btn-primary" onClick={() => window.open(shareUrl, '_blank', 'noreferrer')}>
                <ExternalLink size={14} /> Ver portfolio publicado
              </button>
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificación manual**

Run: `npm run dev`, abrir el modal de Publicar en un portfolio sin publicar.
Expected: el input de dirección queda enfocado (cursor visible) apenas termina la animación de entrada. Publicar, y confirmar que en la vista de éxito el foco pasa al botón "Ver portfolio publicado" (visible el anillo de foco del navegador). Confirmar que Escape y click fuera del modal lo siguen cerrando (comportamiento ya existente, no debe romperse).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/PublishModal.jsx
git commit -m "feat: auto-focus publish modal inputs on open"
```

---

## Task 5: Migración Supabase — columna `views` + función de incremento

**Files:**
- (Supabase remoto, proyecto `portfolio-builder`, id `dzannfaklwjhmkoauokq`) — columna nueva en `portfolios` + función RPC.

**Interfaces:**
- Produces: columna `portfolios.views` (`integer`, default `0`), función `increment_portfolio_views(portfolio_id uuid) returns void`. Usada por `PublicPortfolioPage.jsx` (Task 6) y `DashboardPage.jsx` (Task 9).

- [ ] **Step 1: Aplicar la migración**

Ejecutar la tool MCP de Supabase `apply_migration` sobre el proyecto `dzannfaklwjhmkoauokq`, con `name: "add_portfolio_views_tracking"` y este SQL:

```sql
alter table portfolios add column views integer not null default 0;

create or replace function increment_portfolio_views(portfolio_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update portfolios set views = views + 1 where id = portfolio_id and published = true;
$$;
```

(Se agrega `set search_path = public` respecto al SQL del spec — buena práctica estándar para funciones `security definer` en Postgres/Supabase, evita que la función resuelva `portfolios` contra un `search_path` manipulable. No cambia el comportamiento funcional descrito en el spec.)

- [ ] **Step 2: Verificar el esquema**

Ejecutar la tool MCP `list_tables` sobre el proyecto con `schemas: ["public"]`, `verbose: true`.
Expected: `public.portfolios` incluye ahora la columna `views` (`data_type: "integer"`, `default_value: "0"`).

- [ ] **Step 3: Probar la función manualmente**

Ejecutar la tool MCP `execute_sql` sobre el proyecto con:

```sql
select id, views from portfolios limit 1;
```

Anotar el `id` y el valor actual de `views`. Luego ejecutar:

```sql
select increment_portfolio_views('<id-anotado>'::uuid);
select id, views from portfolios where id = '<id-anotado>'::uuid;
```

Expected: el segundo `select` muestra `views` incrementado en 1 respecto al primero (o sin cambio si ese portfolio no tiene `published = true` — en ese caso, publicar el portfolio de prueba desde la app o con un `update portfolios set published = true where id = '<id-anotado>'::uuid;` antes de repetir la prueba).

No hay commit en este task — el cambio vive en Supabase, no en el repositorio git.

---

## Task 6: Incrementar vistas al visitar un portfolio publicado

**Files:**
- Modify: `src/pages/PublicPortfolioPage.jsx`

**Interfaces:**
- Consumes: `increment_portfolio_views` (Task 5), `supabase.rpc()`.

- [ ] **Step 1: Agregar la llamada de tracking al efecto de carga**

Reemplazar el `useEffect` completo:

```jsx
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
      } else {
        setPortfolio(data);
        setState('ready');
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);
```

por:

```jsx
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
      const isOwnerView = user && user.id === data.user_id;
      const viewedKey = `pb-viewed-${data.id}`;
      if (!isOwnerView && !sessionStorage.getItem(viewedKey)) {
        sessionStorage.setItem(viewedKey, '1');
        supabase.rpc('increment_portfolio_views', { portfolio_id: data.id });
      }
    })();
    return () => { cancelled = true; };
  }, [slug, user]);
```

Nota: se agrega `user` al array de dependencias porque ahora se lee dentro del efecto — con `useAuth()` esto puede re-disparar el efecto si `user` cambia de referencia tras la carga inicial (por ejemplo, al resolver la sesión de Supabase Auth de forma asíncrona). El guard de `sessionStorage` evita que un re-disparo cuente una segunda vista.

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

Run: `npm run dev`. Publicar un portfolio de prueba (o usar uno ya publicado). En una ventana normal del navegador (no logueado, o logueado con otra cuenta), visitar `/p/<slug>`. Confirmar con la tool MCP `execute_sql` (`select views from portfolios where slug = '<slug>';`) que `views` subió en 1. Recargar la misma pestaña varias veces: `views` no debe seguir subiendo (guard de `sessionStorage`). Abrir el portfolio desde la propia cuenta dueña (con el FAB "Editar" visible) y confirmar que visitarlo como dueño no incrementa `views`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PublicPortfolioPage.jsx
git commit -m "feat: track public portfolio views"
```

---

## Task 7: Componente `StatCard`

**Files:**
- Create: `src/components/admin/StatCard.jsx`
- Modify: `src/styles/global.css` (agregar bloque nuevo cerca de `.dash-grid`, después de línea 443)

**Interfaces:**
- Produces: `StatCard({ label: string, value: string | number, hint?: string })` — componente default export. Usado por `DashboardPage.jsx` (Task 9).
- Consumes: `--a-panel-2`, `--a-shadow-sm` (Task 1).

- [ ] **Step 1: Crear el componente**

```jsx
export default function StatCard({ label, value, hint }) {
  return (
    <div className="adm-stat-card">
      <span className="adm-stat-label">{label}</span>
      <span className="adm-stat-value">{value}</span>
      {hint && <span className="adm-stat-hint">{hint}</span>}
    </div>
  );
}
```

Guardar en `src/components/admin/StatCard.jsx`.

- [ ] **Step 2: Agregar los estilos**

Agregar en `src/styles/global.css`, después del bloque `.dash-card-actions` (línea 443):

```css
.dash-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin: 20px 0 28px; }
.adm-stat-card {
  background: var(--a-panel-2); border-radius: 12px; padding: 16px 18px;
  display: flex; flex-direction: column; gap: 6px; box-shadow: var(--a-shadow-sm);
}
.adm-stat-label { font-family: var(--font-mono); font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--a-muted); }
.adm-stat-value { font-family: var(--font-display); font-size: 26px; font-weight: 600; color: var(--a-text); }
.adm-stat-hint { font-size: 11.5px; color: var(--a-muted); }
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores (el componente aún no se usa en ninguna página — el build debe pasar igual, ya que no se importa desde ningún lado todavía; esto se conecta en Task 9).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/StatCard.jsx src/styles/global.css
git commit -m "feat: add StatCard component"
```

---

## Task 8: Componente `AppSidebar`

**Files:**
- Create: `src/components/admin/AppSidebar.jsx`
- Modify: `src/styles/global.css` (agregar bloque nuevo cerca de `.dash-header`, línea 430)

**Interfaces:**
- Produces: `AppSidebar()` — componente default export sin props, renderiza navegación fija. Usado por `DashboardPage.jsx` (Task 9).
- Consumes: `--a-panel-2`, `--a-border`, `--a-muted`, `--a-accent` (Task 1 y variables preexistentes), `react-router-dom` (`Link`), `lucide-react`.

- [ ] **Step 1: Crear el componente**

```jsx
import { Link } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, BarChart3, LayoutTemplate, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', enabled: true },
  { key: 'portfolios', label: 'Portfolios', icon: FolderKanban, enabled: false },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, enabled: false },
  { key: 'templates', label: 'Templates', icon: LayoutTemplate, enabled: false },
  { key: 'settings', label: 'Settings', icon: Settings, enabled: false },
];

export default function AppSidebar() {
  return (
    <nav className="adm-sidebar" aria-label="Navegación principal">
      <div className="adm-brand adm-sidebar-brand"><span className="adm-brand-mark">$</span> portfolio-builder</div>
      <ul className="adm-sidebar-list">
        {NAV_ITEMS.map(({ key, label, icon: Icon, to, enabled }) => (
          <li key={key}>
            {enabled ? (
              <Link to={to} className="adm-sidebar-link is-active">
                <Icon size={16} /> {label}
              </Link>
            ) : (
              <span className="adm-sidebar-link is-disabled" aria-disabled="true">
                <Icon size={16} /> {label}
                <span className="adm-sidebar-badge">Próximamente</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

Guardar en `src/components/admin/AppSidebar.jsx`.

- [ ] **Step 2: Agregar los estilos**

Agregar en `src/styles/global.css`, antes del bloque `.dash-header` (línea 430):

```css
.adm-sidebar {
  width: 220px; flex-shrink: 0; border-right: 1px solid var(--a-border); background: var(--a-panel);
  padding: 18px 12px; display: flex; flex-direction: column; gap: 22px;
}
.adm-sidebar-brand { padding: 0 10px; }
.adm-sidebar-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.adm-sidebar-link {
  display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 7px;
  font-size: 13.5px; font-weight: 500; color: var(--a-text); text-decoration: none;
}
.adm-sidebar-link.is-active { background: #F4E3D8; color: #A8501F; }
.adm-sidebar-link.is-disabled { color: var(--a-muted); cursor: default; opacity: 0.6; justify-content: space-between; }
.adm-sidebar-badge {
  font-family: var(--font-mono); font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.03em;
  border: 1px solid var(--a-border); border-radius: 999px; padding: 2px 6px;
}
@media (max-width: 780px) { .adm-sidebar { display: none; } }
```

Y en el bloque de dark mode admin, después de la línea `html[data-admin-theme="dark"] .adm-tabs button.is-active { background: #3A2C24; color: #F0A480; }` (línea 558):

```css
html[data-admin-theme="dark"] .adm-sidebar-link.is-active { background: #3A2C24; color: #F0A480; }
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores. Si `lucide-react` no expone alguno de los íconos importados (`LayoutDashboard`, `FolderKanban`, `BarChart3`, `LayoutTemplate`, `Settings`), el build falla con "does not provide an export named..." — en ese caso, reemplazar el ícono faltante por otro de `lucide-react` (ej. `Grid` en vez de `LayoutTemplate`) y repetir este step.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AppSidebar.jsx src/styles/global.css
git commit -m "feat: add AppSidebar component"
```

---

## Task 9: Integrar sidebar y stat cards en `DashboardPage`

**Files:**
- Modify: `src/pages/DashboardPage.jsx`
- Modify: `src/styles/global.css:430-436` (`.dash-header`, `.dash-header-actions`, `.dash-main` — se adaptan a la nueva estructura)

**Interfaces:**
- Consumes: `AppSidebar` (Task 8), `StatCard` (Task 7), columna `portfolios.views` (Task 5).

- [ ] **Step 1: Adaptar los estilos de layout**

Reemplazar (líneas 430-436):

```css
.dash-header {
  display: flex; align-items: center; justify-content: space-between; padding: 14px 20px;
  border-bottom: 1px solid var(--a-border); background: var(--a-panel);
}
.dash-header-actions { display: flex; align-items: center; gap: 8px; }
.dash-main { max-width: 760px; margin: 0 auto; padding: 28px 20px 60px; }
.dash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-top: 20px; }
```

por:

```css
/* display: flex (row) intencionalmente sobre-escribe flex-direction: column de .adm-shell,
   mismo truco de cascada por orden que .auth-split (ver línea 181) */
.dash-shell { flex-direction: row; align-items: stretch; }
.dash-content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.dash-topbar {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 14px 20px;
  border-bottom: 1px solid var(--a-border); background: var(--a-panel);
}
.dash-main-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.dash-main-head .adm-panel-desc { margin-bottom: 0; }
.dash-main { max-width: 760px; margin: 0 auto; padding: 28px 20px 60px; width: 100%; }
.dash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-top: 20px; }
```

(`.dash-stats` ya fue agregado en Task 7, Step 2 — no se duplica aquí.)

- [ ] **Step 2: Reescribir `DashboardPage.jsx`**

Reemplazar el archivo completo:

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, ExternalLink, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getInitialData } from '../data/initialData.js';
import ThemeToggle from '../components/admin/ThemeToggle.jsx';
import AppSidebar from '../components/admin/AppSidebar.jsx';
import StatCard from '../components/admin/StatCard.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError('');
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, title, slug, published, updated_at, views')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (!cancelled && !error) setPortfolios(data);
      if (!cancelled && error) setError('No se pudo cargar tus portfolios.');
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    const initial = getInitialData();
    const { data, error } = await supabase
      .from('portfolios')
      .insert({
        user_id: user.id,
        title: 'Mi portfolio',
        theme: initial.theme,
        sections: initial.sections,
      })
      .select('id')
      .single();
    setCreating(false);
    if (!error && data) navigate(`/editor/${data.id}`);
    if (error) setError('No se pudo crear el portfolio.');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este portfolio? Esta acción no se puede deshacer.')) return;
    setError('');
    const { data, error } = await supabase.from('portfolios').delete().eq('id', id).select('id');
    if (!error && data && data.length > 0) setPortfolios((prev) => prev.filter((p) => p.id !== id));
    if (error || !data || data.length === 0) setError('No se pudo eliminar el portfolio.');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const totalViews = portfolios.reduce((sum, p) => sum + (p.views || 0), 0);

  return (
    <div className="dash-shell adm-shell">
      <AppSidebar />
      <div className="dash-content">
        <header className="dash-topbar">
          <ThemeToggle />
          <button type="button" className="adm-btn-ghost" onClick={handleSignOut}>
            <LogOut size={14} /> Cerrar sesión
          </button>
        </header>
        <main className="dash-main">
          <div className="dash-main-head">
            <div>
              <h1 className="adm-panel-title">Tus portfolios</h1>
              <p className="adm-panel-desc">Crea, edita o publica tus portfolios.</p>
            </div>
            <button type="button" className="adm-btn-primary" onClick={handleCreate} disabled={creating}>
              <Plus size={14} /> {creating ? 'Creando…' : 'Nuevo portfolio'}
            </button>
          </div>
          {error && <p className="adm-error">{error}</p>}

          <div className="dash-stats">
            <StatCard label="Portfolios activos" value={portfolios.length} />
            <StatCard label="Vistas totales" value={totalViews} />
          </div>

          {loading && <p className="adm-empty">Cargando…</p>}
          {!loading && portfolios.length === 0 && (
            <p className="adm-empty" style={{ marginTop: 20 }}>Todavía no tienes portfolios. Crea el primero arriba.</p>
          )}

          <div className="dash-grid">
            {portfolios.map((p) => (
              <div key={p.id} className="dash-card">
                <h3 className="dash-card-title">{p.title}</h3>
                <span className="dash-card-meta">
                  {p.published ? `Publicado · /p/${p.slug}` : 'Sin publicar'}
                </span>
                <div className="dash-card-actions">
                  <button type="button" className="adm-btn-ghost" onClick={() => navigate(`/editor/${p.id}`)}>
                    <Pencil size={14} /> Editar
                  </button>
                  {p.published && (
                    <a className="adm-btn-ghost" href={`/p/${p.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button type="button" className="adm-btn-ghost" onClick={() => handleDelete(p.id)} aria-label="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificación manual completa**

Run: `npm run dev`, ir a `/dashboard`.
Expected:
- Sidebar visible a la izquierda con "Dashboard" resaltado y los otros 4 ítems atenuados con badge "Próximamente" (sin ser clickeables de forma funcional).
- Fila de 2 stat cards ("Portfolios activos" con el conteo real, "Vistas totales" con la suma real — si nunca se visitó ningún portfolio publicado, debe mostrar `0`, no vacío ni error).
- Botón "Nuevo portfolio" y el resto del flujo (crear, editar, eliminar, publicar) siguen funcionando igual que antes.
- Toggle de tema y "Cerrar sesión" siguen funcionando desde la topbar nueva.
- Modo oscuro: sidebar, stat cards y topbar se ven consistentes con el resto (reusa Task 1).
- Mobile (ancho de navegador < 780px, o `resize_window` a preset mobile en el Browser pane): el sidebar se oculta, el contenido usa el ancho completo, nada se corta ni se superpone.
- Confirmar que `/editor/<id>` no cambió de layout (sigue con header horizontal, sin sidebar).

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardPage.jsx src/styles/global.css
git commit -m "feat: integrate sidebar and stat cards into dashboard"
```

---

## Self-Review Notes

- **Cobertura del spec:** Fase 0 → Task 1. Fase 1 → Tasks 2 y 3. Fase 2 → Task 3. Fase 3 → Task 1 (Step 4, auditoría integrada porque comparte los mismos tokens dark). Fase 4 → Tasks 2 (transición) y 4 (auto-focus). Fase 5 → Tasks 5-9 (backend, tracking, ambos componentes, integración). Las exclusiones explícitas del spec (Storage Used, drag-and-drop, páginas Analytics/Templates/Settings funcionales, perfil de usuario) no tienen tarea — correcto, están fuera de alcance.
- **Placeholders:** ninguno — todos los steps tienen código completo o comandos/SQL exactos.
- **Consistencia de tipos/nombres:** `StatCard({ label, value, hint })` se define en Task 7 y se consume en Task 9 con las mismas props (`label`, `value`, sin `hint`, que es opcional). `AppSidebar()` no recibe props en ninguna de las dos tareas. La función RPC se llama `increment_portfolio_views` de forma consistente entre Task 5 (creación) y Task 6 (consumo). La columna `views` se nombra igual en la migración (Task 5), el `select` de `PublicPortfolioPage` (no se modifica, no la necesita) y el `select` de `DashboardPage` (Task 9).
