# Admin Theme Unification + Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `LoginPage`, `DashboardPage`, and `EditorPage` share one CSS-variable-driven theme system, and add a persisted dark mode toggle to the admin panel (not the public portfolio).

**Architecture:** `.adm-shell` already defines the `--a-*` CSS custom properties consumed across the admin UI. We add it as a second class on the Login/Dashboard root elements so they inherit those variables, rewrite their hardcoded hex colors to `var(--a-*)`, and add a `html[data-admin-theme="dark"] .adm-shell { ... }` override block with a cool/neutral dark palette. Theme state (`light`/`dark`) lives in a new `ThemeContext` (same pattern as the existing `AuthContext`), persisted to `localStorage` and mirrored onto `<html data-admin-theme>` — a distinct attribute from the public portfolio's own `.pf-scope[data-theme]`, so the two theming systems can't collide. An inline script in `index.html` sets the attribute before React mounts to avoid a flash of the wrong theme.

**Tech Stack:** React 18, react-router-dom, plain CSS (no CSS-in-JS, no Tailwind), lucide-react icons, Vite.

## Global Constraints

- Dark palette is neutral/cool (not warm-tinted like `.pf-scope`'s existing dark mode): background ~`#181818`, panel ~`#212121`, border ~`#333333`, text ~`#EDEDED`, muted ~`#9A9A9A`.
- Accent color `--a-accent: #D97757` stays identical in light and dark.
- Dark mode attribute is `data-admin-theme` on `<html>` — never reuse `data-theme` (that belongs to `.pf-scope`, the per-portfolio public theme, which this work must not touch).
- Theme toggle: defaults to `prefers-color-scheme`, then persists the user's explicit choice in `localStorage` under key `pb-admin-theme`.
- `.pf-scope` / `PublicPortfolioPage` / published portfolio rendering must be visually unchanged.
- No test framework exists in this project (`package.json` has none) — verification is `npm run build` (catches syntax/import errors) plus manual browser checks called out in the final task.

---

### Task 1: ThemeContext + app-wide wiring + flash-prevention script

**Files:**
- Create: `src/context/ThemeContext.jsx`
- Modify: `src/App.jsx`
- Modify: `index.html`

**Interfaces:**
- Produces: `ThemeProvider` (component, wraps children), `useTheme()` returning `{ theme: 'light' | 'dark', toggleTheme: () => void }`. Later tasks (`ThemeToggle` component) import `useTheme` from `../../context/ThemeContext.jsx` (relative to `src/components/admin/`).

- [ ] **Step 1: Create `src/context/ThemeContext.jsx`**

```jsx
import { createContext, useContext, useLayoutEffect, useState } from 'react';

const STORAGE_KEY = 'pb-admin-theme';
const ThemeContext = createContext(undefined);

function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-admin-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const value = { theme, toggleTheme };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
```

- [ ] **Step 2: Wire `ThemeProvider` into `src/App.jsx`**

Read the current file first (already read during planning — full contents below for reference):

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

Apply this edit (add the import and wrap `AuthProvider`):

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
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
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/editor/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
            <Route path="/p/:slug" element={<PublicPortfolioPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 3: Add the flash-prevention script to `index.html`**

Current file:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Portfolio Builder</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💼</text></svg>" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Insert a synchronous script right after the `<title>` tag:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Portfolio Builder</title>
    <script>
      (function () {
        var stored = localStorage.getItem('pb-admin-theme');
        var theme = stored === 'light' || stored === 'dark'
          ? stored
          : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-admin-theme', theme);
      })();
    </script>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💼</text></svg>" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: build succeeds with no errors (this exercises `App.jsx`, which now imports `ThemeContext.jsx`, catching any syntax mistakes).

- [ ] **Step 5: Commit**

```bash
git add src/context/ThemeContext.jsx src/App.jsx index.html
git commit -m "feat: add ThemeContext with persisted admin dark mode state"
```

---

### Task 2: `ThemeToggle` component + Editor integration

**Files:**
- Create: `src/components/admin/ThemeToggle.jsx`
- Modify: `src/pages/EditorPage.jsx`

**Interfaces:**
- Consumes: `useTheme()` from `../../context/ThemeContext.jsx` (Task 1).
- Produces: default-exported `ThemeToggle` component, props `{ className = 'adm-btn-ghost' }`. Later tasks (Login, Dashboard) import it as `import ThemeToggle from '../components/admin/ThemeToggle.jsx'`.

- [ ] **Step 1: Create `src/components/admin/ThemeToggle.jsx`**

```jsx
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function ThemeToggle({ className = 'adm-btn-ghost' }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
```

- [ ] **Step 2: Add it to the Editor header**

In `src/pages/EditorPage.jsx`, add the import next to the other component imports:

```jsx
import PublishModal from '../components/admin/PublishModal.jsx';
import ThemeToggle from '../components/admin/ThemeToggle.jsx';
import { slugify } from '../utils/slugify.js';
```

Then update the header actions block:

```jsx
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
```

becomes:

```jsx
        <div className="adm-header-actions">
          <ThemeToggle />
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
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ThemeToggle.jsx src/pages/EditorPage.jsx
git commit -m "feat: add ThemeToggle and wire it into the Editor header"
```

---

### Task 3: CSS unification — variables everywhere + dark palette

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `--a-bg`, `--a-panel`, `--a-border`, `--a-text`, `--a-muted`, `--a-accent`, `--a-accent-contrast` (already defined on `.adm-shell`, lines 13-18 — unchanged by this task).
- Produces: `html[data-admin-theme="dark"] .adm-shell { ... }` override block, and hex-free `.auth-*` / `.dash-*` / `.adm-modal*` rules that later tasks (Login/Dashboard JSX changes) rely on rendering correctly once `adm-shell` is added to their root element.

- [ ] **Step 1: Replace the modal color rules (lines 151-174) to use variables**

Find this block in `src/styles/global.css`:

```css
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
```

Replace it with:

```css
.adm-modal-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex;
  align-items: center; justify-content: center; padding: 20px; z-index: 50;
}
.adm-modal {
  background: var(--a-panel); border: 1px solid var(--a-border); border-radius: 14px; padding: 28px; max-width: 400px; width: 100%;
  position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.2); font-family: var(--font-body);
}
.adm-modal-close {
  position: absolute; top: 14px; right: 14px; background: none; border: none;
  color: var(--a-muted); cursor: pointer; padding: 4px; display: flex;
}
.adm-modal-title { font-family: var(--font-display); font-size: 19px; margin: 0 0 8px; color: var(--a-text); }
.adm-modal-desc { font-size: 13px; color: var(--a-muted); margin: 0 0 16px; line-height: 1.5; }
.adm-slug-preview { font-family: var(--font-mono); font-size: 12px; color: var(--a-muted); margin: 8px 0 0; }
.adm-error { font-size: 12px; color: #B84C3A; margin: 6px 0 0; }
.adm-copy-row {
  display: flex; align-items: center; gap: 8px; background: var(--a-bg); border: 1px solid var(--a-border);
  border-radius: 8px; padding: 8px 10px; margin-bottom: 18px;
}
```

- [ ] **Step 2: Replace the auth/dashboard chrome block (lines 175-214) to use variables**

Find this block:

```css
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
.auth-switch { text-align: center; margin-top: 16px; font-size: 13px; color: #8A8272; }

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
```

(Note: `.auth-switch` appears twice verbatim in the current file — both occurrences are covered by this replacement.)

Replace the whole block with:

```css
/* ---------- Auth / dashboard chrome ---------- */
.adm-loading-screen {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  font-family: var(--font-body); color: var(--a-muted); background: var(--a-bg);
}
.auth-shell {
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.auth-card {
  background: var(--a-panel); border: 1px solid var(--a-border); border-radius: 14px; padding: 32px;
  max-width: 380px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.06); position: relative;
}
.auth-title { font-family: var(--font-display); font-size: 24px; margin: 0 0 6px; color: var(--a-text); }
.auth-subtitle { font-size: 13.5px; color: var(--a-muted); margin: 0 0 22px; }
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.auth-divider { display: flex; align-items: center; gap: 10px; margin: 18px 0; color: var(--a-muted); font-size: 12px; }
.auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: var(--a-border); }
.auth-switch { text-align: center; margin-top: 16px; font-size: 13px; color: var(--a-muted); }
.auth-btn-google {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
  border: 1px solid var(--a-border); background: var(--a-panel); color: var(--a-text); padding: 9px 16px; border-radius: 7px;
  font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font-body);
}
.auth-btn-google:hover { background: var(--a-bg); }
.auth-theme-toggle { position: absolute; top: 14px; right: 14px; }

.dash-header {
  display: flex; align-items: center; justify-content: space-between; padding: 14px 20px;
  border-bottom: 1px solid var(--a-border); background: var(--a-panel);
}
.dash-header-actions { display: flex; align-items: center; gap: 8px; }
.dash-main { max-width: 760px; margin: 0 auto; padding: 28px 20px 60px; }
.dash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-top: 20px; }
.dash-card {
  border: 1px solid var(--a-border); border-radius: 12px; padding: 18px; background: var(--a-panel);
  display: flex; flex-direction: column; gap: 8px;
}
.dash-card-title { font-family: var(--font-display); font-size: 17px; margin: 0; color: var(--a-text); }
.dash-card-meta { font-size: 12px; color: var(--a-muted); font-family: var(--font-mono); }
.dash-card-actions { display: flex; gap: 8px; margin-top: 8px; }
```

`.dash-shell` is intentionally dropped: once `adm-shell` is added as a second class on the Dashboard root (Task 4... actually Task 5), it already supplies `min-height: 100vh`, `background`, `color`, and `font-family`. Leave the `dash-shell` class name in the JSX (Task 5) as a layout hook even though it currently carries no rules of its own — it groups the dashboard-specific structure conceptually and is harmless.

- [ ] **Step 3: Add the dark mode override block**

Find this line near the end of the file:

```css
@media (max-width: 640px) {
```

Insert a new block immediately before it:

```css
/* ---------- Admin dark mode ---------- */
html[data-admin-theme="dark"] .adm-shell {
  --a-bg: #181818;
  --a-panel: #212121;
  --a-border: #333333;
  --a-text: #EDEDED;
  --a-muted: #9A9A9A;
  --a-accent: #D97757;
  --a-accent-contrast: #FFFFFF;
}
html[data-admin-theme="dark"] .adm-tabs button.is-active { background: #3A2C24; color: #F0A480; }
html[data-admin-theme="dark"] .adm-variant-card.is-active { background: #2A211C; }

@media (max-width: 640px) {
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: build succeeds (CSS errors surface as Vite build failures too).

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "refactor: unify admin CSS on shared variables and add dark palette"
```

---

### Task 4: Unify `LoginPage` and add its theme toggle

**Files:**
- Modify: `src/pages/LoginPage.jsx`

**Interfaces:**
- Consumes: `ThemeToggle` default export from `../components/admin/ThemeToggle.jsx` (Task 2), `.auth-theme-toggle` CSS class (Task 3).

- [ ] **Step 1: Add the `ThemeToggle` import**

At the top of `src/pages/LoginPage.jsx`:

```jsx
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '../components/admin/ThemeToggle.jsx';
```

- [ ] **Step 2: Add `adm-shell` to the root element and render the toggle**

Find:

```jsx
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">$ portfolio-builder</h1>
```

Replace with:

```jsx
  return (
    <div className="auth-shell adm-shell">
      <div className="auth-card">
        <ThemeToggle className="adm-btn-ghost auth-theme-toggle" />
        <h1 className="auth-title">$ portfolio-builder</h1>
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LoginPage.jsx
git commit -m "feat: unify LoginPage on admin theme variables and add dark mode toggle"
```

---

### Task 5: Unify `DashboardPage` and add its theme toggle

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

**Interfaces:**
- Consumes: `ThemeToggle` default export from `../components/admin/ThemeToggle.jsx` (Task 2), `.dash-header-actions` CSS class (Task 3).

- [ ] **Step 1: Add the `ThemeToggle` import**

At the top of `src/pages/DashboardPage.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, ExternalLink, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getInitialData } from '../data/initialData.js';
import ThemeToggle from '../components/admin/ThemeToggle.jsx';
```

- [ ] **Step 2: Add `adm-shell` to the root element and wrap header actions**

Find:

```jsx
  return (
    <div className="dash-shell">
      <header className="dash-header">
        <div className="adm-brand"><span className="adm-brand-mark">$</span> portfolio-builder</div>
        <button type="button" className="adm-btn-ghost" onClick={handleSignOut}>
          <LogOut size={14} /> Cerrar sesión
        </button>
      </header>
```

Replace with:

```jsx
  return (
    <div className="dash-shell adm-shell">
      <header className="dash-header">
        <div className="adm-brand"><span className="adm-brand-mark">$</span> portfolio-builder</div>
        <div className="dash-header-actions">
          <ThemeToggle />
          <button type="button" className="adm-btn-ghost" onClick={handleSignOut}>
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </header>
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: unify DashboardPage on admin theme variables and add dark mode toggle"
```

---

### Task 6: Manual verification pass

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open the printed local URL in a browser.

- [ ] **Step 2: Check Login page**

Navigate to `/login`. Confirm:
- Page background, card, inputs, and buttons render using the warm light palette (no visual regression vs. before this plan).
- The sun/moon toggle appears top-right of the card and switches the whole page to the dark palette (background ~`#181818`, card ~`#212121`, readable light text) when clicked, and back to light when clicked again.

- [ ] **Step 3: Check Dashboard page**

Sign in, land on `/dashboard`. Confirm:
- Header, cards, and buttons match the same light/dark palette as Login.
- Toggling dark mode here also affects Login/Editor when navigating to them (shared `localStorage` + `html` attribute) without a page reload needed.

- [ ] **Step 4: Check Editor page**

Open a portfolio in `/editor/:id`. Confirm:
- Header, tabs, forms, and the publish modal all render correctly in both themes (check the "Publicar" modal specifically, since Task 3 changed its colors to variables).
- The toggle in the Editor header stays in sync with the choice made on Login/Dashboard.

- [ ] **Step 5: Confirm persistence**

With dark mode active, reload the page (hard refresh). Confirm the page renders dark immediately with no flash of the light theme.

- [ ] **Step 6: Confirm the public portfolio is untouched**

Publish or open an already-published portfolio at `/p/:slug` while the admin panel is in dark mode. Confirm the public page's own light/dark appearance (controlled by its own `theme` setting in the Design tab) is unaffected by the admin `data-admin-theme` attribute — it should look exactly as it did before this plan.

- [ ] **Step 7: Report results**

No commit for this task — if any check fails, fix the relevant task's CSS/JSX and re-run `npm run build` before re-verifying here.
