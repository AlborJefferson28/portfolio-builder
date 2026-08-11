# Migración a Vite + React + Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar `portfolio-builder.jsx` (prototipo de un solo archivo basado en `window.storage`) a una app Vite + React estándar, multi-usuario, con Supabase (Auth + Postgres) como backend, deployable en Vercel.

**Architecture:** SPA con `react-router-dom` (`/login`, `/dashboard`, `/editor/:id`, `/p/:slug`). Los componentes de renderizado público y los de administración del prototipo se extraen tal cual a módulos separados (son puros o casi puros, sin cambios de lógica). Toda la persistencia pasa de `window.storage` a una única tabla `portfolios` en Supabase con RLS: el dueño lee/escribe su fila, cualquiera puede leer una fila `published = true`.

**Tech Stack:** Vite, React 18, react-router-dom, @supabase/supabase-js, lucide-react, recharts. CSS plano (sin Tailwind).

## Global Constraints

- No se introduce ningún framework de testing automatizado — decisión explícita del spec (`docs/superpowers/specs/2026-08-10-vite-supabase-migration-design.md`, sección "Testing"). La verificación de cada tarea es manual: `npm run build` debe pasar, y donde aplique, revisión visual con `npm run dev`.
- La foto de perfil del Hero sigue siendo solo una URL de texto — no se agrega Supabase Storage ni subida de archivos.
- Cada portfolio es una sola fila en `portfolios` (sin copia separada de "borrador" vs. "publicado" — ver spec, sección "Simplificación").
- Rutas reales con `react-router-dom`, no hash routing.
- El anon key de Supabase (`VITE_SUPABASE_ANON_KEY`) es seguro de exponer en el cliente porque la protección real es RLS en la base de datos.
- Todos los textos de interfaz permanecen en español, igual que el prototipo original.

---

## Task 1: Scaffolding del proyecto Vite

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `vercel.json`
- Create: `src/main.jsx`
- Create: `src/App.jsx` (placeholder mínimo, se completa en Task 16)

**Interfaces:**
- Produces: comando `npm run dev` levanta un servidor Vite; `npm run build` genera `dist/`.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "portfolio-builder",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.4",
    "lucide-react": "^0.462.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.13.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^5.4.11"
  }
}
```

- [ ] **Step 2: Crear `vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 3: Crear `index.html`**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Portfolio Builder</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Crear `.gitignore`**

```
node_modules
dist
.env
.env.local
```

- [ ] **Step 5: Crear `.env.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 6: Crear `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 7: Crear `src/App.jsx` (placeholder temporal)**

```jsx
export default function App() {
  return <div>Portfolio Builder — en construcción</div>;
}
```

- [ ] **Step 8: Crear `src/main.jsx`**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 9: Instalar dependencias y verificar dev server**

Run: `npm install && npm run dev -- --port 5173 &`
Expected: el servidor arranca sin errores en `http://localhost:5173`. Verifica en el navegador que se ve el texto "Portfolio Builder — en construcción". Detén el servidor (`kill %1` o Ctrl+C).

- [ ] **Step 10: Commit**

```bash
git add package.json vite.config.js index.html .gitignore .env.example vercel.json src/App.jsx src/main.jsx package-lock.json
git commit -m "chore: scaffold Vite + React project"
```

---

## Task 2: Utilidades (`uid`, `slugify`, `initials`)

**Files:**
- Create: `src/utils/uid.js`
- Create: `src/utils/slugify.js`
- Create: `src/utils/initials.js`

**Interfaces:**
- Produces: `uid()` → string única; `slugify(text)` → string; `initials(name)` → string. Usadas por `data/initialData.js`, componentes admin y públicos en tareas posteriores.

- [ ] **Step 1: Crear `src/utils/uid.js`**

```js
let uidCounter = 0;

export function uid() {
  uidCounter += 1;
  return `id_${uidCounter}_${Math.random().toString(36).slice(2, 7)}`;
}
```

- [ ] **Step 2: Crear `src/utils/slugify.js`**

```js
export function slugify(text) {
  const base = (text || '')
    .toString()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'mi-portfolio';
}
```

- [ ] **Step 3: Crear `src/utils/initials.js`**

```js
export function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}
```

- [ ] **Step 4: Verificación manual rápida**

Run: `node -e "import('./src/utils/slugify.js').then(m => console.log(m.slugify('Jeferson Álvarez!')))"`
Expected: imprime `jeferson-alvarez`

- [ ] **Step 5: Commit**

```bash
git add src/utils/uid.js src/utils/slugify.js src/utils/initials.js
git commit -m "feat: add uid, slugify, initials utils"
```

---

## Task 3: Datos iniciales (`SECTION_META`, `getInitialData`)

**Files:**
- Create: `src/data/sectionMeta.js`
- Create: `src/data/initialData.js`

**Interfaces:**
- Consumes: `uid` de `src/utils/uid.js`
- Produces: `SECTION_META` (objeto), `getInitialData()` → `{ theme, sections }`. Usado por `DashboardPage` (Task 13, al crear un portfolio nuevo) y componentes admin (Tasks 6-9).

- [ ] **Step 1: Crear `src/data/sectionMeta.js`**

```js
export const SECTION_META = {
  hero: {
    label: 'Hero',
    variants: {
      centered: { label: 'Centrado', description: 'Todo alineado al centro, enfoque directo.' },
      split: { label: 'Editorial dividido', description: 'Texto a un lado, foto grande al otro.' },
    },
  },
  about: {
    label: 'Sobre mí',
    variants: {
      default: { label: 'Simple', description: 'Un bloque de texto legible.' },
    },
  },
  projects: {
    label: 'Proyectos',
    variants: {
      grid: { label: 'Grid', description: 'Tarjetas en cuadrícula, tipo galería.' },
      list: { label: 'Lista numerada', description: 'Fila por fila, con índice.' },
    },
  },
  skills: {
    label: 'Habilidades',
    variants: {
      tags: { label: 'Tags', description: 'Etiquetas agrupadas, sin niveles.' },
      bar: { label: 'Gráfico de barras', description: 'Nivel de cada habilidad en barras.' },
      radar: { label: 'Gráfico radar', description: 'Vista comparativa tipo radar.' },
    },
  },
  experience: {
    label: 'Experiencia',
    variants: {
      timeline: { label: 'Línea de tiempo', description: 'Vertical, con marcador por período.' },
      compact: { label: 'Lista compacta', description: 'Más densa, sin elementos gráficos.' },
    },
  },
  contact: {
    label: 'Contacto',
    variants: {
      default: { label: 'Simple', description: 'Email destacado + redes.' },
    },
  },
};
```

- [ ] **Step 2: Crear `src/data/initialData.js`**

```js
import { uid } from '../utils/uid.js';

export function getInitialData() {
  return {
    theme: 'light',
    sections: [
      {
        id: 'hero', type: 'hero', enabled: true, variant: 'centered',
        content: {
          name: '',
          role: '',
          tagline: '',
          photoUrl: '',
        },
      },
      {
        id: 'about', type: 'about', enabled: true, variant: 'default',
        content: {
          body: '',
        },
      },
      {
        id: 'projects', type: 'projects', enabled: true, variant: 'grid',
        content: { items: [] },
      },
      {
        id: 'skills', type: 'skills', enabled: true, variant: 'bar',
        content: { items: [] },
      },
      {
        id: 'experience', type: 'experience', enabled: true, variant: 'timeline',
        content: { items: [] },
      },
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
    ],
  };
}
```

Nota: a diferencia del prototipo original, `getInitialData()` ya no incluye `meta.publishedSlug`/`publishedAt` (eso ahora vive en las columnas `slug`/`published`/`published_at` de la tabla `portfolios`) y arranca con campos vacíos en vez de datos de ejemplo de Jeferson, porque ahora cualquier usuario puede crear un portfolio nuevo desde el dashboard.

- [ ] **Step 3: Verificación manual**

Run: `node -e "import('./src/data/initialData.js').then(m => console.log(JSON.stringify(m.getInitialData()).length > 0))"`
Expected: imprime `true`

- [ ] **Step 4: Commit**

```bash
git add src/data/sectionMeta.js src/data/initialData.js
git commit -m "feat: add SECTION_META and getInitialData"
```

---

## Task 4: CSS global

**Files:**
- Create: `src/styles/global.css`

**Interfaces:**
- Produces: hoja de estilos global importada por `src/main.jsx` (Task 16). Mismas clases (`adm-*`, `pf-*`) que consumen los componentes de Tasks 5-9, sin cambios.

- [ ] **Step 1: Crear `src/styles/global.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.adm-shell, .pf-scope {
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace;
}
.adm-shell *, .pf-scope * { box-sizing: border-box; }

/* ---------- Admin chrome ---------- */
.adm-shell {
  --a-bg: #FAF8F4; --a-panel: #FFFFFF; --a-border: #E7E2D8; --a-text: #262019;
  --a-muted: #8A8272; --a-accent: #D97757; --a-accent-contrast: #FFFFFF;
  min-height: 100vh; background: var(--a-bg); color: var(--a-text);
  font-family: var(--font-body); display: flex; flex-direction: column;
}
.adm-header {
  display: flex; align-items: center; gap: 24px; padding: 14px 20px;
  border-bottom: 1px solid var(--a-border); background: var(--a-panel);
  flex-wrap: wrap; position: sticky; top: 0; z-index: 10;
}
.adm-brand { font-family: var(--font-mono); font-size: 13px; color: var(--a-muted); white-space: nowrap; }
.adm-brand-mark { color: var(--a-accent); margin-right: 4px; }
.adm-tabs { display: flex; gap: 4px; flex: 1; flex-wrap: wrap; }
.adm-tabs button {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border: none;
  background: transparent; color: var(--a-muted); font-size: 13px; font-weight: 500;
  border-radius: 7px; cursor: pointer; font-family: var(--font-body);
}
.adm-tabs button:hover { background: var(--a-bg); color: var(--a-text); }
.adm-tabs button.is-active { background: #F4E3D8; color: #A8501F; }
.adm-header-actions { display: flex; align-items: center; gap: 10px; }
.adm-save-indicator { font-size: 12px; color: var(--a-muted); }

.adm-btn-primary {
  background: var(--a-accent); color: var(--a-accent-contrast); border: none; padding: 9px 16px;
  border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font-body);
  display: inline-flex; align-items: center; gap: 6px;
}
.adm-btn-primary:hover { background: #C4643F; }
.adm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.adm-btn-ghost {
  background: transparent; border: 1px solid var(--a-border); color: var(--a-text); padding: 8px 12px;
  border-radius: 7px; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center;
  gap: 6px; font-family: var(--font-body);
}
.adm-link-btn {
  background: none; border: none; color: var(--a-muted); font-size: 12.5px; text-decoration: underline;
  cursor: pointer; font-family: var(--font-body); padding: 4px;
}

.adm-main { flex: 1; padding: 28px 20px 60px; max-width: 760px; margin: 0 auto; width: 100%; }
.adm-panel-title { font-family: var(--font-display); font-size: 22px; font-weight: 600; margin: 0 0 4px; }
.adm-panel-desc { color: var(--a-muted); font-size: 13.5px; margin: 0 0 20px; }
.adm-empty { color: var(--a-muted); font-size: 13.5px; }

.adm-section-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.adm-section-row {
  display: flex; align-items: center; gap: 14px; background: var(--a-panel);
  border: 1px solid var(--a-border); border-radius: 10px; padding: 12px 14px;
}
.adm-section-name { flex: 1; font-size: 14px; font-weight: 500; }
.adm-reorder { display: flex; gap: 2px; }
.adm-reorder button { background: none; border: none; color: var(--a-muted); cursor: pointer; padding: 4px; border-radius: 5px; }
.adm-reorder button:hover:not(:disabled) { background: var(--a-bg); color: var(--a-text); }
.adm-reorder button:disabled { opacity: 0.3; cursor: default; }

.adm-toggle {
  width: 34px; height: 20px; border-radius: 999px; border: none; background: #D8D1C2;
  position: relative; cursor: pointer; flex-shrink: 0; transition: background 0.15s;
}
.adm-toggle.is-on { background: var(--a-accent); }
.adm-toggle-thumb {
  position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
  background: #fff; transition: transform 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
.adm-toggle.is-on .adm-toggle-thumb { transform: translateX(14px); }

.adm-content-block { margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px solid var(--a-border); }
.adm-content-block:last-child { border-bottom: none; }
.adm-content-heading {
  font-family: var(--font-mono); font-size: 12px; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--a-muted); margin: 0 0 14px;
}

.adm-form-grid { display: flex; flex-direction: column; gap: 14px; }
.adm-field { display: flex; flex-direction: column; gap: 5px; }
.adm-field-label { font-size: 12.5px; font-weight: 600; color: var(--a-text); }
.adm-field-hint { font-size: 11.5px; color: var(--a-muted); }
.adm-input, .adm-textarea {
  border: 1px solid var(--a-border); border-radius: 7px; padding: 9px 11px; font-size: 13.5px;
  font-family: var(--font-body); color: var(--a-text); background: var(--a-panel); width: 100%;
}
.adm-input:focus, .adm-textarea:focus { outline: 2px solid var(--a-accent); outline-offset: 1px; }
.adm-textarea { resize: vertical; }

.adm-list-editor { display: flex; flex-direction: column; gap: 12px; }
.adm-list-item {
  border: 1px solid var(--a-border); border-radius: 10px; padding: 14px; display: flex;
  flex-direction: column; gap: 10px; position: relative; background: var(--a-panel);
}
.adm-list-item-row { flex-direction: row; align-items: center; padding: 10px 12px; }
.adm-remove-btn {
  position: absolute; top: 10px; right: 10px; background: none; border: none;
  color: var(--a-muted); cursor: pointer; padding: 4px; border-radius: 5px;
}
.adm-list-item-row .adm-remove-btn { position: static; margin-left: auto; }
.adm-remove-btn:hover { color: #B84C3A; background: #F6E4DE; }
.adm-add-btn {
  display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; background: none;
  border: 1px dashed var(--a-border); color: var(--a-muted); padding: 8px 12px; border-radius: 7px;
  font-size: 13px; cursor: pointer; font-family: var(--font-body);
}
.adm-add-btn:hover { border-color: var(--a-accent); color: var(--a-accent); }
.adm-range { flex: 1; accent-color: var(--a-accent); }
.adm-range-value { font-family: var(--font-mono); font-size: 12px; color: var(--a-muted); width: 28px; text-align: right; }

.adm-theme-row { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
.adm-segmented { display: inline-flex; border: 1px solid var(--a-border); border-radius: 8px; padding: 2px; }
.adm-segmented button {
  border: none; background: none; padding: 6px 12px; font-size: 12.5px; border-radius: 6px;
  cursor: pointer; color: var(--a-muted); display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-body);
}
.adm-segmented button.is-active { background: var(--a-accent); color: #fff; }

.adm-variant-block { margin-bottom: 26px; }
.adm-variant-block .adm-field-label { display: block; margin-bottom: 10px; }
.adm-variant-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.adm-variant-card {
  text-align: left; border: 1px solid var(--a-border); background: var(--a-panel); border-radius: 10px;
  padding: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; font-family: var(--font-body);
}
.adm-variant-card.is-active { border-color: var(--a-accent); background: #FBF0EA; }
.adm-variant-card-title { font-size: 13px; font-weight: 600; }
.adm-variant-card-desc { font-size: 12px; color: var(--a-muted); line-height: 1.4; }

.adm-preview-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.adm-preview-toolbar { display: flex; justify-content: center; }
.adm-preview-frame {
  width: 100%; max-width: 900px; border: 1px solid var(--a-border); border-radius: 14px;
  overflow: hidden; background: #fff; max-height: 640px; overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0,0,0,0.06);
}
.adm-preview-frame.is-mobile { max-width: 380px; }

.adm-footer { text-align: center; padding: 14px; }

.adm-modal-overlay {
  position: fixed; inset: 0; background: rgba(28, 24, 16, 0.45); display: flex;
  align-items: center; justify-content: center; padding: 20px; z-index: 50;
}
.adm-modal {
  background: #fff; border-radius: 14px; padding: 28px; max-width: 400px; width: 100%;
  position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.2); font-family: var(--font-body);
}
.adm-modal-close {
  position: absolute; top: 14px; right: 14px; background: none; border: none;
  color: #8A8272; cursor: pointer; padding: 4px; display: flex;
}
.adm-modal-title { font-family: var(--font-display); font-size: 19px; margin: 0 0 8px; }
.adm-modal-desc { font-size: 13px; color: #8A8272; margin: 0 0 16px; line-height: 1.5; }
.adm-slug-preview { font-family: var(--font-mono); font-size: 12px; color: #8A8272; margin: 8px 0 0; }
.adm-error { font-size: 12px; color: #B84C3A; margin: 6px 0 0; }
.adm-copy-row {
  display: flex; align-items: center; gap: 8px; background: #FAF8F4; border: 1px solid #E7E2D8;
  border-radius: 8px; padding: 8px 10px; margin-bottom: 18px;
}
.adm-code { font-family: var(--font-mono); font-size: 13px; flex: 1; overflow-x: auto; white-space: nowrap; }
.adm-modal-actions { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.adm-modal .adm-btn-primary { margin-top: 6px; width: 100%; justify-content: center; }

/* ---------- Auth / dashboard chrome (nuevo) ---------- */
.adm-loading-screen {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  font-family: var(--font-body); color: #8A8272; background: #FAF8F4;
}
.auth-shell {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: #FAF8F4; font-family: var(--font-body); padding: 20px;
}
.auth-card {
  background: #fff; border: 1px solid #E7E2D8; border-radius: 14px; padding: 32px;
  max-width: 380px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.06);
}
.auth-title { font-family: var(--font-display); font-size: 24px; margin: 0 0 6px; }
.auth-subtitle { font-size: 13.5px; color: #8A8272; margin: 0 0 22px; }
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.auth-divider { display: flex; align-items: center; gap: 10px; margin: 18px 0; color: #8A8272; font-size: 12px; }
.auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: #E7E2D8; }
.auth-switch { text-align: center; margin-top: 16px; font-size: 13px; color: #8A8272; }
.auth-btn-google {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
  border: 1px solid #E7E2D8; background: #fff; padding: 9px 16px; border-radius: 7px;
  font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font-body);
}
.auth-btn-google:hover { background: #FAF8F4; }

.dash-shell { min-height: 100vh; background: #FAF8F4; font-family: var(--font-body); }
.dash-header {
  display: flex; align-items: center; justify-content: space-between; padding: 14px 20px;
  border-bottom: 1px solid #E7E2D8; background: #fff;
}
.dash-main { max-width: 760px; margin: 0 auto; padding: 28px 20px 60px; }
.dash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-top: 20px; }
.dash-card {
  border: 1px solid #E7E2D8; border-radius: 12px; padding: 18px; background: #fff;
  display: flex; flex-direction: column; gap: 8px;
}
.dash-card-title { font-family: var(--font-display); font-size: 17px; margin: 0; }
.dash-card-meta { font-size: 12px; color: #8A8272; font-family: var(--font-mono); }
.dash-card-actions { display: flex; gap: 8px; margin-top: 8px; }

/* ---------- Public portfolio render ---------- */
.pf-scope {
  --p-bg: #F5F2EC; --p-bg-elevated: #FBF9F5; --p-text: #1C1810; --p-muted: #726B5C;
  --p-border: #E4DDCE; --p-accent: #D97757; --p-accent-soft: rgba(217,119,87,0.12);
}
.pf-scope[data-theme="dark"] {
  --p-bg: #1B1712; --p-bg-elevated: #221E17; --p-text: #F2ECE0; --p-muted: #A69C89;
  --p-border: #3A342A; --p-accent: #E08962; --p-accent-soft: rgba(224,137,98,0.14);
}
.pf-page { background: var(--p-bg); color: var(--p-text); font-family: var(--font-body); min-height: 100vh; }
.pf-section { padding: 64px 24px; max-width: 860px; margin: 0 auto; }
.pf-eyebrow { font-family: var(--font-mono); font-size: 12.5px; color: var(--p-accent); margin: 0 0 14px; letter-spacing: 0.02em; }
.pf-status-screen {
  min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; gap: 10px; padding: 40px; font-family: var(--font-body); background: var(--p-bg); color: var(--p-text);
}
.pf-status-title { font-family: var(--font-display); font-size: 20px; margin: 0; }
.pf-status-desc { color: var(--p-muted); font-size: 14px; max-width: 360px; margin: 0 0 8px; }

.pf-section.pf-hero { text-align: center; padding-top: 90px; }
.pf-hero-centered .pf-hero-avatar, .pf-hero-centered .pf-hero-photo {
  width: 84px; height: 84px; border-radius: 50%; margin: 0 auto 22px; object-fit: cover;
  display: flex; align-items: center; justify-content: center; background: var(--p-accent-soft);
  color: var(--p-accent); font-family: var(--font-display); font-size: 26px; border: 1px solid var(--p-border);
}
.pf-hero-name { font-family: var(--font-display); font-size: clamp(36px, 7vw, 58px); font-weight: 600; margin: 0 0 6px; line-height: 1.05; }
.pf-hero-role { font-family: var(--font-mono); font-size: 13.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--p-muted); margin: 0 0 20px; }
.pf-hero-tagline { font-size: 17px; color: var(--p-muted); max-width: 480px; margin: 0 auto; line-height: 1.6; }

.pf-hero.pf-hero-split {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 40px;
  align-items: center; text-align: left; padding-top: 90px;
}
.pf-hero-split .pf-hero-name { font-size: clamp(32px, 5.5vw, 50px); }
.pf-hero-split .pf-hero-tagline { margin: 0; max-width: none; }
.pf-hero-split .pf-hero-visual {
  aspect-ratio: 4/5; border-radius: 16px; background: var(--p-accent-soft); display: flex;
  align-items: center; justify-content: center; font-family: var(--font-display); font-size: 60px;
  color: var(--p-accent); overflow: hidden; border: 1px solid var(--p-border);
}
.pf-hero-split .pf-hero-visual img { width: 100%; height: 100%; object-fit: cover; }

.pf-about-body { font-size: 17px; line-height: 1.75; max-width: 640px; color: var(--p-text); margin: 0; }

.pf-projects-heading, .pf-skills-heading, .pf-experience-heading, .pf-contact-heading {
  font-family: var(--font-display); font-size: 30px; margin: 0 0 30px;
}
.pf-projects-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
.pf-project-card {
  border: 1px solid var(--p-border); border-radius: 14px; padding: 22px; background: var(--p-bg-elevated);
  display: flex; flex-direction: column; gap: 10px; transition: transform 0.15s, border-color 0.15s;
}
.pf-project-card:hover { transform: translateY(-2px); border-color: var(--p-accent); }
.pf-project-title { font-family: var(--font-display); font-size: 19px; font-weight: 600; margin: 0; }
.pf-project-desc { font-size: 14px; color: var(--p-muted); line-height: 1.55; margin: 0; }
.pf-project-stack { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.pf-tag {
  font-family: var(--font-mono); font-size: 11px; padding: 3px 8px; border-radius: 5px;
  background: var(--p-accent-soft); color: var(--p-accent);
}
.pf-project-link { font-size: 12.5px; color: var(--p-accent); text-decoration: none; margin-top: 4px; }

.pf-projects-list { display: flex; flex-direction: column; }
.pf-project-row { display: grid; grid-template-columns: 50px 1fr; gap: 18px; padding: 22px 0; border-bottom: 1px solid var(--p-border); }
.pf-project-row:first-child { border-top: 1px solid var(--p-border); }
.pf-project-index { font-family: var(--font-mono); color: var(--p-muted); font-size: 13px; }

.pf-skills-tags { display: flex; flex-wrap: wrap; gap: 10px; }
.pf-skill-tag { font-family: var(--font-mono); font-size: 13px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--p-border); color: var(--p-text); }
.pf-chart-wrap { width: 100%; }

.pf-timeline { position: relative; padding-left: 24px; display: flex; flex-direction: column; gap: 30px; }
.pf-timeline::before { content: ''; position: absolute; left: 4px; top: 6px; bottom: 6px; width: 1px; background: var(--p-border); }
.pf-timeline-item { position: relative; }
.pf-timeline-item::before { content: ''; position: absolute; left: -24px; top: 5px; width: 9px; height: 9px; border-radius: 50%; background: var(--p-accent); }
.pf-timeline-period { font-family: var(--font-mono); font-size: 12px; color: var(--p-muted); margin: 0 0 4px; }
.pf-timeline-role { font-family: var(--font-display); font-size: 18px; font-weight: 600; margin: 0 0 4px; }
.pf-timeline-desc { font-size: 14px; color: var(--p-muted); line-height: 1.6; margin: 0; }

.pf-exp-compact-item { padding: 14px 0; border-bottom: 1px solid var(--p-border); display: flex; justify-content: space-between; gap: 16px; }
.pf-exp-compact-item:first-child { border-top: 1px solid var(--p-border); }

.pf-contact { text-align: center; }
.pf-contact-email {
  font-family: var(--font-display); font-size: clamp(22px, 4vw, 32px); color: var(--p-accent);
  text-decoration: none; display: inline-block; margin-bottom: 24px; word-break: break-word;
}
.pf-contact-links { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.pf-contact-link { font-family: var(--font-mono); font-size: 13px; padding: 9px 16px; border-radius: 999px; border: 1px solid var(--p-border); color: var(--p-text); text-decoration: none; }
.pf-contact-link:hover { border-color: var(--p-accent); color: var(--p-accent); }

.pf-colophon { text-align: center; padding: 30px 24px 50px; }
.pf-colophon p { font-family: var(--font-mono); font-size: 11px; color: var(--p-muted); margin: 0; }

.pf-public-wrap { min-height: 100vh; position: relative; }
.pf-edit-fab {
  position: fixed; bottom: 20px; right: 20px; background: #1C1810; color: #fff; border: none;
  padding: 10px 16px; border-radius: 999px; font-size: 13px; cursor: pointer; display: inline-flex;
  align-items: center; gap: 6px; font-family: var(--font-body); box-shadow: 0 8px 20px rgba(0,0,0,0.25); opacity: 0.85;
  text-decoration: none;
}
.pf-edit-fab:hover { opacity: 1; }

@media (max-width: 640px) {
  .adm-main { padding: 20px 14px 50px; }
  .pf-project-row { grid-template-columns: 30px 1fr; }
  .pf-hero-split .pf-hero-visual { max-width: 260px; margin: 0 auto; aspect-ratio: 1/1; }
}
@media (prefers-reduced-motion: reduce) {
  .adm-shell *, .pf-scope * { transition: none !important; animation: none !important; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add global stylesheet"
```

---

## Task 5: Componentes públicos de renderizado

**Files:**
- Create: `src/components/public/HeroCentered.jsx`
- Create: `src/components/public/HeroSplit.jsx`
- Create: `src/components/public/AboutBlock.jsx`
- Create: `src/components/public/ProjectsGrid.jsx`
- Create: `src/components/public/ProjectsList.jsx`
- Create: `src/components/public/SkillsTags.jsx`
- Create: `src/components/public/SkillsBar.jsx`
- Create: `src/components/public/SkillsRadar.jsx`
- Create: `src/components/public/ExperienceTimeline.jsx`
- Create: `src/components/public/ExperienceCompact.jsx`
- Create: `src/components/public/ContactBlock.jsx`
- Create: `src/components/public/sectionComponents.js`
- Create: `src/components/public/PortfolioRenderer.jsx`

**Interfaces:**
- Consumes: `initials` de `src/utils/initials.js`
- Produces: `PortfolioRenderer({ sections, theme })` — usado por `PreviewTab` (Task 8) y `PublicPortfolioPage` (Task 15).

- [ ] **Step 1: Crear `src/components/public/HeroCentered.jsx`**

```jsx
import { initials } from '../../utils/initials.js';

export default function HeroCentered({ content }) {
  return (
    <section className="pf-section pf-hero pf-hero-centered">
      <p className="pf-eyebrow">// hola, soy</p>
      {content.photoUrl ? (
        <img src={content.photoUrl} alt={content.name} className="pf-hero-photo" />
      ) : (
        <div className="pf-hero-avatar" aria-hidden="true">{initials(content.name)}</div>
      )}
      <h1 className="pf-hero-name">{content.name || 'Tu nombre'}</h1>
      <p className="pf-hero-role">{content.role || 'Tu rol'}</p>
      {content.tagline && <p className="pf-hero-tagline">{content.tagline}</p>}
    </section>
  );
}
```

- [ ] **Step 2: Crear `src/components/public/HeroSplit.jsx`**

```jsx
import { initials } from '../../utils/initials.js';

export default function HeroSplit({ content }) {
  return (
    <section className="pf-section pf-hero pf-hero-split">
      <div>
        <p className="pf-eyebrow">// hola, soy</p>
        <h1 className="pf-hero-name">{content.name || 'Tu nombre'}</h1>
        <p className="pf-hero-role">{content.role || 'Tu rol'}</p>
        {content.tagline && <p className="pf-hero-tagline">{content.tagline}</p>}
      </div>
      <div className="pf-hero-visual">
        {content.photoUrl ? <img src={content.photoUrl} alt={content.name} /> : initials(content.name)}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Crear `src/components/public/AboutBlock.jsx`**

```jsx
export default function AboutBlock({ content }) {
  return (
    <section className="pf-section pf-about">
      <p className="pf-eyebrow">// sobre mí</p>
      <p className="pf-about-body">{content.body}</p>
    </section>
  );
}
```

- [ ] **Step 4: Crear `src/components/public/ProjectsGrid.jsx`**

```jsx
export default function ProjectsGrid({ content }) {
  return (
    <section className="pf-section pf-projects">
      <p className="pf-eyebrow">// proyectos</p>
      <h2 className="pf-projects-heading">Proyectos</h2>
      <div className="pf-projects-grid">
        {content.items.map((p) => (
          <article key={p.id} className="pf-project-card">
            <h3 className="pf-project-title">{p.title || 'Proyecto'}</h3>
            {p.description && <p className="pf-project-desc">{p.description}</p>}
            {p.stack && (
              <div className="pf-project-stack">
                {p.stack.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                  <span key={i} className="pf-tag">{s}</span>
                ))}
              </div>
            )}
            {p.url && <a className="pf-project-link" href={p.url} target="_blank" rel="noreferrer">Ver proyecto →</a>}
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Crear `src/components/public/ProjectsList.jsx`**

```jsx
export default function ProjectsList({ content }) {
  return (
    <section className="pf-section pf-projects">
      <p className="pf-eyebrow">// proyectos</p>
      <h2 className="pf-projects-heading">Proyectos</h2>
      <div className="pf-projects-list">
        {content.items.map((p, i) => (
          <div key={p.id} className="pf-project-row">
            <span className="pf-project-index">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3 className="pf-project-title">{p.title || 'Proyecto'}</h3>
              {p.description && <p className="pf-project-desc">{p.description}</p>}
              {p.stack && (
                <div className="pf-project-stack">
                  {p.stack.split(',').map((s) => s.trim()).filter(Boolean).map((s, i2) => (
                    <span key={i2} className="pf-tag">{s}</span>
                  ))}
                </div>
              )}
              {p.url && <a className="pf-project-link" href={p.url} target="_blank" rel="noreferrer">Ver proyecto →</a>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Crear `src/components/public/SkillsTags.jsx`**

```jsx
export default function SkillsTags({ content }) {
  return (
    <section className="pf-section pf-skills">
      <p className="pf-eyebrow">// habilidades</p>
      <h2 className="pf-skills-heading">Habilidades</h2>
      <div className="pf-skills-tags">
        {content.items.map((it) => <span key={it.id} className="pf-skill-tag">{it.name}</span>)}
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Crear `src/components/public/SkillsBar.jsx`**

```jsx
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
} from 'recharts';

export default function SkillsBar({ content }) {
  return (
    <section className="pf-section pf-skills">
      <p className="pf-eyebrow">// habilidades</p>
      <h2 className="pf-skills-heading">Habilidades</h2>
      <div className="pf-chart-wrap" style={{ height: Math.max(220, content.items.length * 46) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={content.items} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 13, fill: '#8A8272', fontFamily: 'Inter, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="level" fill="#D97757" radius={[0, 6, 6, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 8: Crear `src/components/public/SkillsRadar.jsx`**

```jsx
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

export default function SkillsRadar({ content }) {
  return (
    <section className="pf-section pf-skills">
      <p className="pf-eyebrow">// habilidades</p>
      <h2 className="pf-skills-heading">Habilidades</h2>
      <div className="pf-chart-wrap" style={{ height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={content.items} outerRadius="70%">
            <PolarGrid stroke="#B5AC98" />
            <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: '#8A8272', fontFamily: 'Inter, sans-serif' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="level" stroke="#D97757" fill="#D97757" fillOpacity={0.28} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 9: Crear `src/components/public/ExperienceTimeline.jsx`**

```jsx
export default function ExperienceTimeline({ content }) {
  return (
    <section className="pf-section pf-experience">
      <p className="pf-eyebrow">// experiencia</p>
      <h2 className="pf-experience-heading">Experiencia</h2>
      <div className="pf-timeline">
        {content.items.map((it) => (
          <div key={it.id} className="pf-timeline-item">
            <p className="pf-timeline-period">{it.period}</p>
            <h3 className="pf-timeline-role">{it.role}{it.org ? ` · ${it.org}` : ''}</h3>
            {it.description && <p className="pf-timeline-desc">{it.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 10: Crear `src/components/public/ExperienceCompact.jsx`**

```jsx
export default function ExperienceCompact({ content }) {
  return (
    <section className="pf-section pf-experience">
      <p className="pf-eyebrow">// experiencia</p>
      <h2 className="pf-experience-heading">Experiencia</h2>
      <div>
        {content.items.map((it) => (
          <div key={it.id} className="pf-exp-compact-item">
            <div>
              <h3 className="pf-timeline-role" style={{ marginBottom: it.description ? 4 : 0 }}>
                {it.role}{it.org ? ` · ${it.org}` : ''}
              </h3>
              {it.description && <p className="pf-timeline-desc">{it.description}</p>}
            </div>
            <p className="pf-timeline-period" style={{ whiteSpace: 'nowrap' }}>{it.period}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 11: Crear `src/components/public/ContactBlock.jsx`**

```jsx
export default function ContactBlock({ content }) {
  return (
    <section className="pf-section pf-contact">
      <p className="pf-eyebrow">// contacto</p>
      <h2 className="pf-contact-heading">Hablemos</h2>
      {content.email && <a className="pf-contact-email" href={`mailto:${content.email}`}>{content.email}</a>}
      {content.links && content.links.length > 0 && (
        <div className="pf-contact-links">
          {content.links.map((l) => (
            <a key={l.id} className="pf-contact-link" href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 12: Crear `src/components/public/sectionComponents.js`**

```js
import HeroCentered from './HeroCentered.jsx';
import HeroSplit from './HeroSplit.jsx';
import AboutBlock from './AboutBlock.jsx';
import ProjectsGrid from './ProjectsGrid.jsx';
import ProjectsList from './ProjectsList.jsx';
import SkillsTags from './SkillsTags.jsx';
import SkillsBar from './SkillsBar.jsx';
import SkillsRadar from './SkillsRadar.jsx';
import ExperienceTimeline from './ExperienceTimeline.jsx';
import ExperienceCompact from './ExperienceCompact.jsx';
import ContactBlock from './ContactBlock.jsx';

export const SECTION_COMPONENTS = {
  hero: { centered: HeroCentered, split: HeroSplit },
  about: { default: AboutBlock },
  projects: { grid: ProjectsGrid, list: ProjectsList },
  skills: { tags: SkillsTags, bar: SkillsBar, radar: SkillsRadar },
  experience: { timeline: ExperienceTimeline, compact: ExperienceCompact },
  contact: { default: ContactBlock },
};
```

- [ ] **Step 13: Crear `src/components/public/PortfolioRenderer.jsx`**

```jsx
import { SECTION_COMPONENTS } from './sectionComponents.js';

export default function PortfolioRenderer({ sections, theme }) {
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
          return Comp ? <Comp key={section.id} content={section.content} /> : null;
        })}
        <footer className="pf-colophon">
          <p>Tipografía: Fraunces · Inter · JetBrains Mono</p>
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 14: Verificación con un smoke test temporal en `App.jsx`**

Edita temporalmente `src/App.jsx`:

```jsx
import { getInitialData } from './data/initialData.js';
import PortfolioRenderer from './components/public/PortfolioRenderer.jsx';
import './styles/global.css';

export default function App() {
  const data = getInitialData();
  return <PortfolioRenderer sections={data.sections} theme={data.theme} />;
}
```

Run: `npm run dev` y abre `http://localhost:5173`.
Expected: se ve la página pública con secciones vacías (mensaje "Activa al menos una sección..." NO debería aparecer porque todas están `enabled: true`; en cambio verás Hero/About/Proyectos/etc. con placeholders vacíos, sin errores en consola).

Deja este cambio en `App.jsx` — se sobreescribirá en el Task 16.

- [ ] **Step 15: Commit**

```bash
git add src/components/public src/App.jsx
git commit -m "feat: extract public rendering components"
```

---

## Task 6: Átomos de admin y `SectionsTab`

**Files:**
- Create: `src/components/admin/Field.jsx`
- Create: `src/components/admin/Toggle.jsx`
- Create: `src/components/admin/SectionsTab.jsx`

**Interfaces:**
- Consumes: `SECTION_META` de `src/data/sectionMeta.js`
- Produces: `Field`, `Toggle`, `SectionsTab({ sections, onToggle, onMove })` — usados por los forms (Task 7) y `EditorPage` (Task 14).

- [ ] **Step 1: Crear `src/components/admin/Field.jsx`**

```jsx
export default function Field({ label, hint, children }) {
  return (
    <label className="adm-field">
      <span className="adm-field-label">{label}</span>
      {children}
      {hint && <span className="adm-field-hint">{hint}</span>}
    </label>
  );
}
```

- [ ] **Step 2: Crear `src/components/admin/Toggle.jsx`**

```jsx
export default function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`adm-toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="adm-toggle-thumb" />
    </button>
  );
}
```

- [ ] **Step 3: Crear `src/components/admin/SectionsTab.jsx`**

```jsx
import { ChevronUp, ChevronDown } from 'lucide-react';
import Toggle from './Toggle.jsx';
import { SECTION_META } from '../../data/sectionMeta.js';

export default function SectionsTab({ sections, onToggle, onMove }) {
  return (
    <div className="adm-panel">
      <h2 className="adm-panel-title">Secciones</h2>
      <p className="adm-panel-desc">Activa las secciones que quieres mostrar y ordénalas con las flechas.</p>
      <ul className="adm-section-list">
        {sections.map((s, i) => (
          <li key={s.id} className="adm-section-row">
            <Toggle checked={s.enabled} onChange={(v) => onToggle(s.id, v)} />
            <span className="adm-section-name">{SECTION_META[s.type].label}</span>
            <div className="adm-reorder">
              <button type="button" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label="Mover arriba">
                <ChevronUp size={16} />
              </button>
              <button type="button" disabled={i === sections.length - 1} onClick={() => onMove(i, 1)} aria-label="Mover abajo">
                <ChevronDown size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/Field.jsx src/components/admin/Toggle.jsx src/components/admin/SectionsTab.jsx
git commit -m "feat: add admin atoms and SectionsTab"
```

---

## Task 7: Forms de contenido y `ContentTab`

**Files:**
- Create: `src/components/admin/forms/HeroForm.jsx`
- Create: `src/components/admin/forms/AboutForm.jsx`
- Create: `src/components/admin/forms/ProjectsForm.jsx`
- Create: `src/components/admin/forms/SkillsForm.jsx`
- Create: `src/components/admin/forms/ExperienceForm.jsx`
- Create: `src/components/admin/forms/ContactForm.jsx`
- Create: `src/components/admin/ContentForm.jsx`
- Create: `src/components/admin/ContentTab.jsx`

**Interfaces:**
- Consumes: `Field` (Task 6), `uid` (Task 2), `SECTION_META` (Task 3)
- Produces: `ContentTab({ sections, onUpdateContent })` — usado por `EditorPage` (Task 14).

- [ ] **Step 1: Crear `src/components/admin/forms/HeroForm.jsx`**

```jsx
import Field from '../Field.jsx';

export default function HeroForm({ content, onChange }) {
  const set = (k, v) => onChange({ ...content, [k]: v });
  return (
    <div className="adm-form-grid">
      <Field label="Nombre"><input className="adm-input" value={content.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Rol"><input className="adm-input" value={content.role} onChange={(e) => set('role', e.target.value)} /></Field>
      <Field label="Tagline" hint="Una frase corta debajo de tu nombre">
        <textarea className="adm-textarea" rows={2} value={content.tagline} onChange={(e) => set('tagline', e.target.value)} />
      </Field>
      <Field label="Foto (URL)" hint="Opcional. Si lo dejas vacío, se muestran tus iniciales.">
        <input className="adm-input" value={content.photoUrl} onChange={(e) => set('photoUrl', e.target.value)} placeholder="https://..." />
      </Field>
    </div>
  );
}
```

- [ ] **Step 2: Crear `src/components/admin/forms/AboutForm.jsx`**

```jsx
import Field from '../Field.jsx';

export default function AboutForm({ content, onChange }) {
  return (
    <div className="adm-form-grid">
      <Field label="Bio">
        <textarea className="adm-textarea" rows={5} value={content.body} onChange={(e) => onChange({ ...content, body: e.target.value })} />
      </Field>
    </div>
  );
}
```

- [ ] **Step 3: Crear `src/components/admin/forms/ProjectsForm.jsx`**

```jsx
import { Plus, Trash2 } from 'lucide-react';
import Field from '../Field.jsx';
import { uid } from '../../../utils/uid.js';

export default function ProjectsForm({ content, onChange }) {
  const items = content.items;
  const updateItem = (id, patch) => onChange({ ...content, items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const addItem = () => onChange({ ...content, items: [...items, { id: uid(), title: '', description: '', stack: '', url: '' }] });
  const removeItem = (id) => onChange({ ...content, items: items.filter((it) => it.id !== id) });
  return (
    <div className="adm-list-editor">
      {items.map((it) => (
        <div key={it.id} className="adm-list-item">
          <button type="button" className="adm-remove-btn" onClick={() => removeItem(it.id)} aria-label="Eliminar proyecto"><Trash2 size={14} /></button>
          <Field label="Título"><input className="adm-input" value={it.title} onChange={(e) => updateItem(it.id, { title: e.target.value })} /></Field>
          <Field label="Descripción"><textarea className="adm-textarea" rows={2} value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} /></Field>
          <Field label="Stack" hint="Separado por comas"><input className="adm-input" value={it.stack} onChange={(e) => updateItem(it.id, { stack: e.target.value })} /></Field>
          <Field label="Link" hint="Opcional"><input className="adm-input" value={it.url} onChange={(e) => updateItem(it.id, { url: e.target.value })} placeholder="https://..." /></Field>
        </div>
      ))}
      <button type="button" className="adm-add-btn" onClick={addItem}><Plus size={14} /> Agregar proyecto</button>
    </div>
  );
}
```

- [ ] **Step 4: Crear `src/components/admin/forms/SkillsForm.jsx`**

```jsx
import { Plus, Trash2 } from 'lucide-react';
import { uid } from '../../../utils/uid.js';

export default function SkillsForm({ content, onChange }) {
  const items = content.items;
  const updateItem = (id, patch) => onChange({ ...content, items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const addItem = () => onChange({ ...content, items: [...items, { id: uid(), name: '', level: 70 }] });
  const removeItem = (id) => onChange({ ...content, items: items.filter((it) => it.id !== id) });
  return (
    <div className="adm-list-editor">
      {items.map((it) => (
        <div key={it.id} className="adm-list-item adm-list-item-row">
          <input className="adm-input" style={{ flex: 1 }} value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} placeholder="Nombre" />
          <input type="range" min="0" max="100" value={it.level} onChange={(e) => updateItem(it.id, { level: Number(e.target.value) })} className="adm-range" />
          <span className="adm-range-value">{it.level}</span>
          <button type="button" className="adm-remove-btn" onClick={() => removeItem(it.id)} aria-label="Eliminar habilidad"><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" className="adm-add-btn" onClick={addItem}><Plus size={14} /> Agregar habilidad</button>
    </div>
  );
}
```

- [ ] **Step 5: Crear `src/components/admin/forms/ExperienceForm.jsx`**

```jsx
import { Plus, Trash2 } from 'lucide-react';
import Field from '../Field.jsx';
import { uid } from '../../../utils/uid.js';

export default function ExperienceForm({ content, onChange }) {
  const items = content.items;
  const updateItem = (id, patch) => onChange({ ...content, items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const addItem = () => onChange({ ...content, items: [...items, { id: uid(), role: '', org: '', period: '', description: '' }] });
  const removeItem = (id) => onChange({ ...content, items: items.filter((it) => it.id !== id) });
  return (
    <div className="adm-list-editor">
      {items.map((it) => (
        <div key={it.id} className="adm-list-item">
          <button type="button" className="adm-remove-btn" onClick={() => removeItem(it.id)} aria-label="Eliminar experiencia"><Trash2 size={14} /></button>
          <Field label="Rol"><input className="adm-input" value={it.role} onChange={(e) => updateItem(it.id, { role: e.target.value })} /></Field>
          <Field label="Empresa"><input className="adm-input" value={it.org} onChange={(e) => updateItem(it.id, { org: e.target.value })} /></Field>
          <Field label="Período" hint="Ej. 2023 — Presente"><input className="adm-input" value={it.period} onChange={(e) => updateItem(it.id, { period: e.target.value })} /></Field>
          <Field label="Descripción"><textarea className="adm-textarea" rows={2} value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} /></Field>
        </div>
      ))}
      <button type="button" className="adm-add-btn" onClick={addItem}><Plus size={14} /> Agregar experiencia</button>
    </div>
  );
}
```

- [ ] **Step 6: Crear `src/components/admin/forms/ContactForm.jsx`**

```jsx
import { Plus, Trash2 } from 'lucide-react';
import Field from '../Field.jsx';
import { uid } from '../../../utils/uid.js';

export default function ContactForm({ content, onChange }) {
  const links = content.links;
  const updateLink = (id, patch) => onChange({ ...content, links: links.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const addLink = () => onChange({ ...content, links: [...links, { id: uid(), label: '', url: '' }] });
  const removeLink = (id) => onChange({ ...content, links: links.filter((l) => l.id !== id) });
  return (
    <div className="adm-form-grid">
      <Field label="Email"><input className="adm-input" value={content.email} onChange={(e) => onChange({ ...content, email: e.target.value })} /></Field>
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

- [ ] **Step 7: Crear `src/components/admin/ContentForm.jsx`**

```jsx
import HeroForm from './forms/HeroForm.jsx';
import AboutForm from './forms/AboutForm.jsx';
import ProjectsForm from './forms/ProjectsForm.jsx';
import SkillsForm from './forms/SkillsForm.jsx';
import ExperienceForm from './forms/ExperienceForm.jsx';
import ContactForm from './forms/ContactForm.jsx';

export default function ContentForm({ section, onChange }) {
  switch (section.type) {
    case 'hero': return <HeroForm content={section.content} onChange={onChange} />;
    case 'about': return <AboutForm content={section.content} onChange={onChange} />;
    case 'projects': return <ProjectsForm content={section.content} onChange={onChange} />;
    case 'skills': return <SkillsForm content={section.content} onChange={onChange} />;
    case 'experience': return <ExperienceForm content={section.content} onChange={onChange} />;
    case 'contact': return <ContactForm content={section.content} onChange={onChange} />;
    default: return null;
  }
}
```

- [ ] **Step 8: Crear `src/components/admin/ContentTab.jsx`**

```jsx
import ContentForm from './ContentForm.jsx';
import { SECTION_META } from '../../data/sectionMeta.js';

export default function ContentTab({ sections, onUpdateContent }) {
  const active = sections.filter((s) => s.enabled);
  if (active.length === 0) {
    return <div className="adm-panel"><p className="adm-empty">Activa al menos una sección para empezar a editar su contenido.</p></div>;
  }
  return (
    <div className="adm-panel">
      {active.map((s) => (
        <div key={s.id} className="adm-content-block">
          <h3 className="adm-content-heading">{SECTION_META[s.type].label}</h3>
          <ContentForm section={s} onChange={(next) => onUpdateContent(s.id, next)} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/forms src/components/admin/ContentForm.jsx src/components/admin/ContentTab.jsx
git commit -m "feat: add content forms and ContentTab"
```

---

## Task 8: `DesignTab` y `PreviewTab`

**Files:**
- Create: `src/components/admin/DesignTab.jsx`
- Create: `src/components/admin/PreviewTab.jsx`

**Interfaces:**
- Consumes: `SECTION_META` (Task 3), `PortfolioRenderer` (Task 5)
- Produces: `DesignTab({ sections, theme, onVariantChange, onThemeChange })`, `PreviewTab({ sections, theme, viewport, onViewportChange })` — usados por `EditorPage` (Task 14).

- [ ] **Step 1: Crear `src/components/admin/DesignTab.jsx`**

```jsx
import { SECTION_META } from '../../data/sectionMeta.js';

export default function DesignTab({ sections, theme, onVariantChange, onThemeChange }) {
  const withVariants = sections.filter((s) => s.enabled && Object.keys(SECTION_META[s.type].variants).length > 1);
  return (
    <div className="adm-panel">
      <h2 className="adm-panel-title">Diseño</h2>
      <div className="adm-theme-row">
        <span className="adm-field-label">Tema</span>
        <div className="adm-segmented">
          <button type="button" className={theme === 'light' ? 'is-active' : ''} onClick={() => onThemeChange('light')}>Claro</button>
          <button type="button" className={theme === 'dark' ? 'is-active' : ''} onClick={() => onThemeChange('dark')}>Oscuro</button>
        </div>
      </div>
      {withVariants.map((s) => (
        <div key={s.id} className="adm-variant-block">
          <span className="adm-field-label">{SECTION_META[s.type].label}</span>
          <div className="adm-variant-options">
            {Object.entries(SECTION_META[s.type].variants).map(([key, meta]) => (
              <button
                type="button"
                key={key}
                className={`adm-variant-card ${s.variant === key ? 'is-active' : ''}`}
                onClick={() => onVariantChange(s.id, key)}
              >
                <span className="adm-variant-card-title">{meta.label}</span>
                <span className="adm-variant-card-desc">{meta.description}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {withVariants.length === 0 && (
        <p className="adm-empty">Activa secciones con variantes de diseño (Hero, Proyectos, Habilidades o Experiencia) para verlas aquí.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Crear `src/components/admin/PreviewTab.jsx`**

```jsx
import { Monitor, Smartphone } from 'lucide-react';
import PortfolioRenderer from '../public/PortfolioRenderer.jsx';

export default function PreviewTab({ sections, theme, viewport, onViewportChange }) {
  return (
    <div className="adm-preview-wrap">
      <div className="adm-preview-toolbar">
        <div className="adm-segmented">
          <button type="button" className={viewport === 'desktop' ? 'is-active' : ''} onClick={() => onViewportChange('desktop')}>
            <Monitor size={14} /> Escritorio
          </button>
          <button type="button" className={viewport === 'mobile' ? 'is-active' : ''} onClick={() => onViewportChange('mobile')}>
            <Smartphone size={14} /> Móvil
          </button>
        </div>
      </div>
      <div className={`adm-preview-frame ${viewport === 'mobile' ? 'is-mobile' : ''}`}>
        <PortfolioRenderer sections={sections} theme={theme} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/DesignTab.jsx src/components/admin/PreviewTab.jsx
git commit -m "feat: add DesignTab and PreviewTab"
```

---

## Task 9: `PublishModal`

**Files:**
- Create: `src/components/admin/PublishModal.jsx`

**Interfaces:**
- Consumes: `Field` (Task 6)
- Produces: `PublishModal({ open, onClose, defaultSlug, publishedSlug, onConfirm })` donde `onConfirm(slug)` es `async (slug) => boolean` — usado por `EditorPage` (Task 14).

Diferencia respecto al prototipo: el link a compartir ahora es una URL real (`window.location.origin + '/p/' + slug`) en vez de un fragmento hash (`#/p/<slug>`), y el botón "Ver portfolio publicado" navega con `window.location.assign` a esa URL completa en vez de cambiar `window.location.hash`.

- [ ] **Step 1: Crear `src/components/admin/PublishModal.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { Copy, ExternalLink, X } from 'lucide-react';
import Field from './Field.jsx';

export default function PublishModal({ open, onClose, defaultSlug, publishedSlug, onConfirm }) {
  const [slug, setSlug] = useState(defaultSlug);
  const [view, setView] = useState(publishedSlug ? 'success' : 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open) {
      setSlug(publishedSlug || defaultSlug);
      setView(publishedSlug ? 'success' : 'edit');
      setError(false);
    }
  }, [open, publishedSlug, defaultSlug]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const validSlug = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
  const shareUrl = `${window.location.origin}/p/${slug}`;

  const handleConfirm = async () => {
    setSaving(true);
    setError(false);
    const ok = await onConfirm(slug);
    setSaving(false);
    if (ok) setView('success'); else setError(true);
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="adm-modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        {view === 'success' ? (
          <>
            <h2 className="adm-modal-title">Portfolio publicado</h2>
            <p className="adm-modal-desc">Comparte este link:</p>
            <div className="adm-copy-row">
              <code className="adm-code">{shareUrl}</code>
              <button type="button" className="adm-btn-ghost" onClick={() => navigator.clipboard.writeText(shareUrl)} aria-label="Copiar">
                <Copy size={14} />
              </button>
            </div>
            <div className="adm-modal-actions">
              <button type="button" className="adm-btn-primary" onClick={() => window.open(shareUrl, '_blank', 'noreferrer')}>
                <ExternalLink size={14} /> Ver portfolio publicado
              </button>
              <button type="button" className="adm-link-btn" onClick={() => setView('edit')}>Cambiar dirección</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="adm-modal-title">Publicar portfolio</h2>
            <p className="adm-modal-desc">Elige la dirección de tu portfolio. Solo minúsculas, números y guiones.</p>
            <Field label="Dirección">
              <input
                className="adm-input"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              />
            </Field>
            <p className="adm-slug-preview">.../p/{slug || '···'}</p>
            {!validSlug && slug.length > 0 && <p className="adm-error">Usa solo minúsculas, números y guiones, sin espacios.</p>}
            {error && <p className="adm-error">Esa dirección ya está en uso, o no se pudo publicar. Intenta con otra.</p>}
            <button type="button" className="adm-btn-primary" disabled={!validSlug || saving} onClick={handleConfirm}>
              {saving ? 'Publicando…' : 'Publicar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/PublishModal.jsx
git commit -m "feat: add PublishModal"
```

---

## Task 10: Proyecto Supabase, esquema y RLS

**Files:**
- Create: `src/lib/supabaseClient.js`
- (Supabase remoto) tabla `portfolios` + políticas RLS

**Interfaces:**
- Produces: `supabase` (cliente exportado desde `src/lib/supabaseClient.js`), tabla `portfolios` con columnas `id, user_id, title, slug, theme, sections, published, published_at, created_at, updated_at`. Usado por `AuthContext` (Task 11), `DashboardPage` (Task 13), `EditorPage` (Task 14), `PublicPortfolioPage` (Task 15).

- [ ] **Step 1: Crear el proyecto Supabase**

Usa la organización existente (`kmysqlkkgverioxntbri`, donde ya viven `vault-accounts`, `ready-mvp`, `Budget-app`). Antes de crear, confirma el costo con el usuario si la herramienta lo requiere (`get_cost` / `confirm_cost` para `project`), luego:

Ejecuta la tool MCP de Supabase `create_project` con `name: "portfolio-builder"`, `organization_id: "kmysqlkkgverioxntbri"`, región igual a los otros proyectos (`us-east-1`).

Expected: la respuesta incluye un `project_id` (guárdalo, se usa en los pasos siguientes). El proyecto puede tardar unos minutos en pasar a `ACTIVE_HEALTHY` — verifica con `get_project` antes de continuar al Step 2.

- [ ] **Step 2: Crear la tabla `portfolios` y políticas RLS**

Ejecuta la tool MCP `apply_migration` sobre el proyecto creado, con `name: "create_portfolios_table"` y este SQL:

```sql
create table portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Mi portfolio',
  slug text unique,
  theme text not null default 'light',
  sections jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index portfolios_user_id_idx on portfolios(user_id);
create index portfolios_slug_idx on portfolios(slug) where slug is not null;

alter table portfolios enable row level security;

create policy "Los dueños administran sus portfolios"
  on portfolios for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Cualquiera puede leer portfolios publicados"
  on portfolios for select
  using (published = true);
```

Expected: la migración se aplica sin errores. Verifica con la tool `list_tables` que `portfolios` existe con RLS habilitado, y con `get_advisors` (tipo `security`) que no hay alertas sobre la tabla nueva.

- [ ] **Step 3: Habilitar proveedores de Auth**

Email/password está habilitado por defecto en Supabase Auth — no requiere acción.

Para Google OAuth: informa al usuario que debe configurarlo manualmente desde el dashboard de Supabase (Authentication → Providers → Google), donde necesita crear credenciales OAuth en Google Cloud Console (Client ID y Client Secret) y pegar la Redirect URL que Supabase le indique. Esto no se puede automatizar vía MCP porque requiere una cuenta de Google Cloud del usuario. Documenta este paso pendiente y continúa — el botón de Google en `LoginPage` (Task 12) funcionará en cuanto el usuario complete esta configuración.

- [ ] **Step 4: Obtener URL y anon key, crear `.env.local`**

Ejecuta las tools MCP `get_project_url` y `get_publishable_keys` sobre el proyecto. Crea (fuera de git, ya cubierto por `.gitignore`) el archivo `.env.local` en la raíz del proyecto:

```
VITE_SUPABASE_URL=<url del proyecto>
VITE_SUPABASE_ANON_KEY=<publishable/anon key>
```

- [ ] **Step 5: Crear `src/lib/supabaseClient.js`**

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 6: Verificación manual**

Run: `npm run dev`, abre la consola del navegador y ejecuta `import('/src/lib/supabaseClient.js').then(m => m.supabase.auth.getSession()).then(console.log)` en la consola dev tools.
Expected: no lanza error de red ni de "supabaseUrl is required" — responde `{ data: { session: null }, error: null }`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabaseClient.js
git commit -m "feat: add Supabase client"
```

(No se commitea `.env.local` — ya está en `.gitignore`.)

---

## Task 11: `AuthContext` y `ProtectedRoute`

**Files:**
- Create: `src/context/AuthContext.jsx`
- Create: `src/components/ProtectedRoute.jsx`

**Interfaces:**
- Consumes: `supabase` de `src/lib/supabaseClient.js`
- Produces: `AuthProvider`, `useAuth()` → `{ session, user, loading }`; `ProtectedRoute({ children })` — usados por `App.jsx` (Task 16), `LoginPage` (Task 12), `DashboardPage` (Task 13), `EditorPage` (Task 14), `PublicPortfolioPage` (Task 15).

- [ ] **Step 1: Crear `src/context/AuthContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = { session, user: session ? session.user : null, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Crear `src/components/ProtectedRoute.jsx`**

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="adm-loading-screen">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/context/AuthContext.jsx src/components/ProtectedRoute.jsx
git commit -m "feat: add AuthContext and ProtectedRoute"
```

---

## Task 12: `LoginPage`

**Files:**
- Create: `src/pages/LoginPage.jsx`

**Interfaces:**
- Consumes: `supabase` (Task 10), `useAuth` (Task 11)
- Produces: página `/login` — enrutada en Task 16.

- [ ] **Step 1: Crear `src/pages/LoginPage.jsx`**

```jsx
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const action = mode === 'signin'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error: authError } = await action;
    setSubmitting(false);
    if (authError) setError(authError.message);
  };

  const handleGoogle = async () => {
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (authError) setError(authError.message);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">$ portfolio-builder</h1>
        <p className="auth-subtitle">{mode === 'signin' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}</p>

        <button type="button" className="auth-btn-google" onClick={handleGoogle}>
          Continuar con Google
        </button>

        <div className="auth-divider">o con email</div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="adm-field">
            <span className="adm-field-label">Email</span>
            <input className="adm-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="adm-field">
            <span className="adm-field-label">Contraseña</span>
            <input className="adm-input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="adm-error">{error}</p>}
          <button type="submit" className="adm-btn-primary" disabled={submitting}>
            {submitting ? 'Un momento…' : mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'signin' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button type="button" className="adm-link-btn" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Crear una' : 'Iniciar sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/LoginPage.jsx
git commit -m "feat: add LoginPage"
```

---

## Task 13: `DashboardPage`

**Files:**
- Create: `src/pages/DashboardPage.jsx`

**Interfaces:**
- Consumes: `supabase` (Task 10), `useAuth` (Task 11), `getInitialData` (Task 3)
- Produces: página `/dashboard` — enrutada en Task 16. Fila insertada tiene forma `{ id, user_id, title, slug, theme, sections, published, published_at, created_at, updated_at }`, consumida por `EditorPage` (Task 14) y `PublicPortfolioPage` (Task 15).

- [ ] **Step 1: Crear `src/pages/DashboardPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, ExternalLink, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getInitialData } from '../data/initialData.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, title, slug, published, updated_at')
        .order('updated_at', { ascending: false });
      if (!cancelled && !error) setPortfolios(data);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    setCreating(true);
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
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('portfolios').delete().eq('id', id);
    if (!error) setPortfolios((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="dash-shell">
      <header className="dash-header">
        <div className="adm-brand"><span className="adm-brand-mark">$</span> portfolio-builder</div>
        <button type="button" className="adm-btn-ghost" onClick={handleSignOut}>
          <LogOut size={14} /> Cerrar sesión
        </button>
      </header>
      <main className="dash-main">
        <h1 className="adm-panel-title">Tus portfolios</h1>
        <p className="adm-panel-desc">Crea, edita o publica tus portfolios.</p>
        <button type="button" className="adm-btn-primary" onClick={handleCreate} disabled={creating}>
          <Plus size={14} /> {creating ? 'Creando…' : 'Nuevo portfolio'}
        </button>

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
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: add DashboardPage"
```

---

## Task 14: `EditorPage`

**Files:**
- Create: `src/pages/EditorPage.jsx`

**Interfaces:**
- Consumes: `supabase` (Task 10), `SectionsTab`/`ContentTab`/`DesignTab`/`PreviewTab`/`PublishModal` (Tasks 6-9), `slugify` (Task 2)
- Produces: página `/editor/:id` — enrutada en Task 16.

Reemplaza a `AdminApp` del prototipo. Diferencias clave: `data` ya no vive en `window.storage` sino que se carga desde `supabase.from('portfolios').select().eq('id', id).single()` al montar, y se persiste con `update` (debounce de 600ms, igual que el original). La verificación de dueño ocurre implícitamente vía RLS (si la fila no es del usuario, el `select` no devuelve nada). El botón "Reiniciar borrador" del prototipo se elimina — no aplica en un modelo multi-portfolio (para "reiniciar" el usuario borra el portfolio desde el dashboard y crea uno nuevo).

- [ ] **Step 1: Crear `src/pages/EditorPage.jsx`**

```jsx
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layers, FileText, Palette, Eye, ExternalLink, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import SectionsTab from '../components/admin/SectionsTab.jsx';
import ContentTab from '../components/admin/ContentTab.jsx';
import DesignTab from '../components/admin/DesignTab.jsx';
import PreviewTab from '../components/admin/PreviewTab.jsx';
import PublishModal from '../components/admin/PublishModal.jsx';
import { slugify } from '../utils/slugify.js';

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [portfolio, setPortfolio] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [tab, setTab] = useState('sections');
  const [viewport, setViewport] = useState('desktop');
  const [modalOpen, setModalOpen] = useState(false);
  const [saveState, setSaveState] = useState('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('portfolios').select('*').eq('id', id).single();
      if (cancelled) return;
      if (error || !data) {
        setLoadState('notfound');
      } else {
        setPortfolio(data);
        setLoadState('ready');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (loadState !== 'ready') return undefined;
    setSaveState('saving');
    const t = setTimeout(async () => {
      const { error } = await supabase
        .from('portfolios')
        .update({ sections: portfolio.sections, theme: portfolio.theme, updated_at: new Date().toISOString() })
        .eq('id', id);
      setSaveState(error ? 'idle' : 'saved');
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio && portfolio.sections, portfolio && portfolio.theme]);

  const updateSectionContent = useCallback((sectionId, content) => {
    setPortfolio((p) => ({ ...p, sections: p.sections.map((s) => (s.id === sectionId ? { ...s, content } : s)) }));
  }, []);
  const toggleSection = useCallback((sectionId, enabled) => {
    setPortfolio((p) => ({ ...p, sections: p.sections.map((s) => (s.id === sectionId ? { ...s, enabled } : s)) }));
  }, []);
  const moveSection = useCallback((index, dir) => {
    setPortfolio((p) => {
      const next = [...p.sections];
      const target = index + dir;
      if (target < 0 || target >= next.length) return p;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...p, sections: next };
    });
  }, []);
  const setVariant = useCallback((sectionId, variant) => {
    setPortfolio((p) => ({ ...p, sections: p.sections.map((s) => (s.id === sectionId ? { ...s, variant } : s)) }));
  }, []);
  const setTheme = useCallback((theme) => setPortfolio((p) => ({ ...p, theme })), []);

  const handlePublish = async (slug) => {
    const { error } = await supabase
      .from('portfolios')
      .update({ slug, published: true, published_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return false;
    setPortfolio((p) => ({ ...p, slug, published: true }));
    return true;
  };

  if (loadState === 'loading') return <div className="adm-loading-screen">Cargando…</div>;
  if (loadState === 'notfound') {
    return (
      <div className="adm-loading-screen" style={{ flexDirection: 'column', gap: 12 }}>
        <p>No encontramos este portfolio.</p>
        <Link className="adm-btn-primary" to="/dashboard">Volver al panel</Link>
      </div>
    );
  }

  const heroSection = portfolio.sections.find((s) => s.type === 'hero');
  const defaultSlug = slugify(heroSection && heroSection.content ? heroSection.content.name : 'mi-portfolio');

  return (
    <div className="adm-shell">
      <header className="adm-header">
        <Link to="/dashboard" className="adm-btn-ghost" aria-label="Volver al panel"><ArrowLeft size={14} /></Link>
        <div className="adm-brand"><span className="adm-brand-mark">$</span> {portfolio.title}</div>
        <nav className="adm-tabs">
          <button className={tab === 'sections' ? 'is-active' : ''} onClick={() => setTab('sections')}><Layers size={14} /> Secciones</button>
          <button className={tab === 'content' ? 'is-active' : ''} onClick={() => setTab('content')}><FileText size={14} /> Contenido</button>
          <button className={tab === 'design' ? 'is-active' : ''} onClick={() => setTab('design')}><Palette size={14} /> Diseño</button>
          <button className={tab === 'preview' ? 'is-active' : ''} onClick={() => setTab('preview')}><Eye size={14} /> Vista previa</button>
        </nav>
        <div className="adm-header-actions">
          <span className="adm-save-indicator">
            {saveState === 'saving' ? 'Guardando…' : saveState === 'saved' ? 'Guardado' : ''}
          </span>
          {portfolio.published && (
            <a className="adm-btn-ghost" href={`/p/${portfolio.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> Ver publicado
            </a>
          )}
          <button className="adm-btn-primary" onClick={() => setModalOpen(true)}>Publicar</button>
        </div>
      </header>

      <main className="adm-main">
        {tab === 'sections' && <SectionsTab sections={portfolio.sections} onToggle={toggleSection} onMove={moveSection} />}
        {tab === 'content' && <ContentTab sections={portfolio.sections} onUpdateContent={updateSectionContent} />}
        {tab === 'design' && <DesignTab sections={portfolio.sections} theme={portfolio.theme} onVariantChange={setVariant} onThemeChange={setTheme} />}
        {tab === 'preview' && (
          <PreviewTab sections={portfolio.sections} theme={portfolio.theme} viewport={viewport} onViewportChange={setViewport} />
        )}
      </main>

      <PublishModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultSlug={portfolio.slug || defaultSlug}
        publishedSlug={portfolio.published ? portfolio.slug : null}
        onConfirm={handlePublish}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/EditorPage.jsx
git commit -m "feat: add EditorPage"
```

---

## Task 15: `PublicPortfolioPage`

**Files:**
- Create: `src/pages/PublicPortfolioPage.jsx`

**Interfaces:**
- Consumes: `supabase` (Task 10), `useAuth` (Task 11), `PortfolioRenderer` (Task 5)
- Produces: página `/p/:slug` — enrutada en Task 16.

Diferencia respecto al prototipo: el botón flotante "Editar" solo aparece si el usuario autenticado es el dueño del portfolio (antes siempre aparecía, porque no existía el concepto de multi-usuario).

- [ ] **Step 1: Crear `src/pages/PublicPortfolioPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import PortfolioRenderer from '../components/public/PortfolioRenderer.jsx';

export default function PublicPortfolioPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState('loading');
  const [portfolio, setPortfolio] = useState(null);

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

  if (state === 'loading') {
    return (
      <div className="pf-scope" data-theme="light">
        <div className="pf-status-screen"><p>Cargando portfolio…</p></div>
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
      <PortfolioRenderer sections={portfolio.sections} theme={portfolio.theme} />
      {isOwner && (
        <a className="pf-edit-fab" href={`/editor/${portfolio.id}`}><Pencil size={14} /> Editar</a>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/PublicPortfolioPage.jsx
git commit -m "feat: add PublicPortfolioPage"
```

---

## Task 16: Enrutado final (`App.jsx`, `main.jsx`)

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/main.jsx`

**Interfaces:**
- Consumes: `AuthProvider` (Task 11), `ProtectedRoute` (Task 11), `LoginPage`/`DashboardPage`/`EditorPage`/`PublicPortfolioPage` (Tasks 12-15)

- [ ] **Step 1: Reescribir `src/App.jsx`**

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EditorPage from './pages/EditorPage.jsx';
import PublicPortfolioPage from './pages/PublicPortfolioPage.jsx';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="adm-loading-screen">Cargando…</div>;
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/editor/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
          <Route path="/p/:slug" element={<PublicPortfolioPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Reescribir `src/main.jsx`**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Verificación manual end-to-end**

Run: `npm run dev`, abre `http://localhost:5173`.

Verifica en el navegador:
1. Redirige a `/login`.
2. Crea una cuenta con email/password → redirige a `/dashboard`.
3. "Nuevo portfolio" → navega a `/editor/<id>`.
4. En Contenido, escribe un nombre en Hero → espera "Guardando…" luego "Guardado".
5. Recarga la página `/editor/<id>` → el nombre persiste (confirma que se guardó en Supabase, no en memoria).
6. Click "Publicar", ingresa un slug, confirma → aparece la URL `/p/<slug>`.
7. Abre esa URL en una ventana de incógnito (sin sesión) → el portfolio se ve, sin botón "Editar".
8. Vuelve a `/dashboard` con tu sesión → el portfolio aparece como "Publicado".
9. Elimina el portfolio desde el dashboard → desaparece de la lista, y visitar `/p/<slug>` ahora muestra "No encontramos este portfolio".

Expected: todos los pasos anteriores funcionan sin errores en la consola del navegador.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/main.jsx
git commit -m "feat: wire up routing with AuthProvider and protected routes"
```

---

## Task 17: Retirar el archivo prototipo y limpieza final

**Files:**
- Delete: `portfolio-builder.jsx` (raíz del proyecto — el prototipo original, ya migrado)

**Interfaces:**
- Ninguna — tarea de limpieza.

- [ ] **Step 1: Confirmar que todo el contenido relevante fue migrado**

Compara mentalmente (o con `git diff --stat`) que cada sección del archivo original (`getInitialData`, componentes públicos, componentes admin, `GlobalStyles`, `App`) tiene su equivalente en `src/`. Ya cubierto por Tasks 2-16.

- [ ] **Step 2: Eliminar el archivo raíz**

```bash
git rm portfolio-builder.jsx
```

- [ ] **Step 3: Verificar build de producción**

Run: `npm run build`
Expected: termina sin errores, genera `dist/index.html` y assets.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove migrated single-file prototype"
```

---

## Task 18: Deploy a Vercel

**Files:**
- Ninguno nuevo (usa `vercel.json` de Task 1)

**Interfaces:**
- Ninguna — tarea de infraestructura/deploy.

- [ ] **Step 1: Crear repositorio remoto en GitHub**

Pide confirmación al usuario antes de crear el repo remoto o hacer push (acción visible/compartida). Con `gh`:

```bash
gh repo create portfolio-builder --private --source=. --remote=origin
git push -u origin main
```

- [ ] **Step 2: Importar el proyecto en Vercel**

Indica al usuario que en el dashboard de Vercel debe: "Add New Project" → importar el repo `portfolio-builder` de GitHub → framework preset "Vite" (autodetectado) → antes de desplegar, agregar las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (los mismos valores de `.env.local`) en la sección "Environment Variables".

Esto requiere acceso a la cuenta de Vercel del usuario — no se puede automatizar desde aquí.

- [ ] **Step 3: Verificar el deploy**

Una vez Vercel termina el build, abre la URL asignada (`https://portfolio-builder-*.vercel.app`) y repite la verificación manual del Task 16 Step 3 contra la URL de producción.

Expected: mismo comportamiento que en local — login, crear/editar/publicar portfolio, y ver `/p/<slug>` públicamente.

- [ ] **Step 4: (Opcional) Actualizar Redirect URL de Google OAuth**

Si se configuró Google OAuth en Task 10 Step 3, agregar la URL de producción de Vercel a la lista de "Authorized redirect URIs" en Google Cloud Console y a las "Redirect URLs" permitidas en Supabase Auth settings, para que el login con Google funcione también en producción (no solo en `localhost`).

No requiere commit — es configuración externa en Google Cloud Console y en el dashboard de Supabase.
