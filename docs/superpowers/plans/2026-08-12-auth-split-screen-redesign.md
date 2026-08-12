# Auth Split-Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current centered auth card in `LoginPage.jsx` with a Claude.ai-style split-screen layout: a borderless form on the left (themed light/dark) and a fixed dark visual panel on the right with a looping CSS-only "portfolio building itself" animation.

**Architecture:** Pure CSS/JSX changes to one existing page component (`src/pages/LoginPage.jsx`) and one existing stylesheet (`src/styles/global.css`). No new dependencies, no routing changes, no changes to `AuthContext` or Supabase calls. The page keeps its single-component signin/signup toggle.

**Tech Stack:** React 18 (JSX), plain CSS (no CSS-in-JS, no Tailwind), Vite dev server for manual verification via the Browser pane.

## Global Constraints

- Split 50/50 grid on screens `>= 900px`; below that, single column with the visual pane hidden (`display: none`) — matches current mobile behavior of centered form.
- Visual pane (`.auth-visual-pane`) always uses a fixed dark palette, independent of the user's light/dark theme toggle (`data-admin-theme`).
- Form pane (`.auth-form-pane`) uses the existing theme variables (`--a-bg`, `--a-text`, etc.) so it respects the active theme.
- No borrowed images/video — the portfolio mock in the visual pane is built entirely from `<div>`s styled with CSS gradients/keyframes.
- Animation must respect `prefers-reduced-motion: reduce` by showing the fully-assembled static state instead of animating. The project already has a global rule at `src/styles/global.css:340-342` that sets `animation: none !important; transition: none !important;` on everything under `.adm-shell` when reduced motion is on — new rules must show a sensible static end-state under that rule, not rely on it alone.
- No automated test suite exists in this project (no test runner configured in `package.json`) — verification is manual, via the Browser pane against the Vite dev server (`portfolio-builder-dev`, port 5173, already configured in `.claude/launch.json`).
- Existing functional behavior of `LoginPage.jsx` (Google OAuth, email/password submit, signin/signup toggle, redirect when already authenticated) must not change.

---

### Task 1: Split-screen layout and static portfolio mock

**Files:**
- Modify: `src/styles/global.css:180-199` (replace the old `.auth-shell`/`.auth-card` block)
- Modify: `src/pages/LoginPage.jsx` (full return JSX restructure)

**Interfaces:**
- Consumes: existing `ThemeToggle` component (`src/components/admin/ThemeToggle.jsx`, prop `className`), existing `adm-field`, `adm-input`, `adm-btn-primary`, `adm-link-btn`, `adm-error` classes (unchanged, defined elsewhere in `global.css`).
- Produces: CSS classes `.auth-split`, `.auth-form-pane`, `.auth-form-inner`, `.auth-theme-toggle`, `.auth-visual-pane`, `.auth-visual-eyebrow`, `.auth-visual-title`, `.auth-portfolio-mock`, `.apm-avatar`, `.apm-line`, `.apm-line-name`, `.apm-line-tagline`, `.apm-projects`, `.apm-project`, `.apm-project-1/2/3`, `.apm-chip`, `.apm-dot` — Task 2 adds `@keyframes` and `animation` properties to several of these without renaming them, so keep these exact class names.

- [ ] **Step 1: Replace the auth CSS block in `src/styles/global.css`**

Find this block (currently lines 180-199):

```css
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
```

Replace it with:

```css
/* ---------- Auth split screen ---------- */
.auth-split {
  min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr;
}
.auth-form-pane {
  position: relative; display: flex; align-items: center; justify-content: center;
  padding: 40px 24px; background: var(--a-bg);
}
.auth-form-inner { max-width: 380px; width: 100%; }
.auth-theme-toggle { position: absolute; top: 20px; right: 20px; }

.auth-title { font-family: var(--font-display); font-size: 30px; margin: 0 0 8px; color: var(--a-text); }
.auth-subtitle { font-size: 14px; color: var(--a-muted); margin: 0 0 26px; }
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

.auth-visual-pane {
  --av-bg: #1F1611; --av-bg-2: #2A1D16; --av-text: #F7EFE6; --av-muted: #C9B8A8;
  --av-accent: #F0A480; --av-accent-2: #D97757;
  background: linear-gradient(160deg, var(--av-bg) 0%, var(--av-bg-2) 100%);
  color: var(--av-text); display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 32px; padding: 48px; overflow: hidden;
}
.auth-visual-eyebrow {
  font-family: var(--font-mono); font-size: 12.5px; color: var(--av-accent);
  letter-spacing: 0.04em; margin: 0;
}
.auth-visual-title {
  font-family: var(--font-display); font-size: 26px; line-height: 1.3; text-align: center;
  max-width: 360px; margin: 0; color: var(--av-text);
}

.auth-portfolio-mock {
  width: 260px; background: var(--av-bg-2); border: 1px solid rgba(247,239,230,0.12);
  border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 12px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.35);
}
.apm-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, var(--av-accent), var(--av-accent-2));
}
.apm-line { height: 8px; border-radius: 4px; background: rgba(247,239,230,0.25); }
.apm-line-name { width: 70%; }
.apm-line-tagline { width: 45%; height: 6px; }
.apm-projects { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
.apm-project {
  height: 34px; border-radius: 8px;
  background: linear-gradient(90deg, rgba(247,239,230,0.08), rgba(247,239,230,0.18), rgba(247,239,230,0.08));
}
.apm-chip {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); font-size: 11px; color: var(--av-muted);
  border: 1px solid rgba(247,239,230,0.15); border-radius: 999px; padding: 4px 10px; margin-top: 4px;
}
.apm-dot { width: 6px; height: 6px; border-radius: 50%; background: #7BC67E; }

@media (max-width: 899px) {
  .auth-split { grid-template-columns: 1fr; }
  .auth-visual-pane { display: none; }
}
```

- [ ] **Step 2: Restructure `src/pages/LoginPage.jsx`**

Replace the full file content with:

```jsx
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '../components/admin/ThemeToggle.jsx';

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
    <div className="auth-split adm-shell">
      <div className="auth-form-pane">
        <ThemeToggle className="adm-btn-ghost auth-theme-toggle" />
        <div className="auth-form-inner">
          <h1 className="auth-title">{mode === 'signin' ? 'Bienvenido de vuelta' : 'Creá tu cuenta'}</h1>
          <p className="auth-subtitle">
            {mode === 'signin' ? 'Inicia sesión para continuar' : 'Empezá a armar tu portfolio'}
          </p>

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

      <div className="auth-visual-pane">
        <div className="auth-portfolio-mock">
          <div className="apm-avatar" />
          <div className="apm-line apm-line-name" />
          <div className="apm-line apm-line-tagline" />
          <div className="apm-projects">
            <div className="apm-project apm-project-1" />
            <div className="apm-project apm-project-2" />
            <div className="apm-project apm-project-3" />
          </div>
          <div className="apm-chip"><span className="apm-dot" /> Publicado</div>
        </div>
        <p className="auth-visual-eyebrow">$ tu-portfolio</p>
        <h2 className="auth-visual-title">Creá y personalizá tu portfolio público en minutos</h2>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Start the dev server and verify the layout**

Use the Browser pane tool `preview_start` with `{"name": "portfolio-builder-dev"}`, then navigate to `/login` (confirmed route, `src/App.jsx:23`).

Verify with `read_page` / `computer` screenshot:
- At desktop width (e.g. 1280px via `resize_window` preset `desktop`): two columns are visible side by side — form on the left, dark panel with the static mock (avatar circle, two bars, three project blocks, "Publicado" chip) on the right.
- Toggle theme with the `ThemeToggle` button: the left pane background/text switch between light and dark; the right pane stays the same fixed dark palette.
- At mobile width (`resize_window` preset `mobile`, 375px): the right pane is not rendered (`display: none`), the form pane takes the full width and is centered, matching current mobile behavior.
- Fill and submit the form (or at least confirm the signin/signup toggle switches the title/subtitle/button text) to confirm no functional regression.

Expected: no console errors (`read_console_messages`), layout matches the above for all three checks.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LoginPage.jsx src/styles/global.css
git commit -m "feat: split-screen auth layout with static portfolio mock panel"
```

---

### Task 2: Looping animation for the portfolio mock

**Files:**
- Modify: `src/styles/global.css` (append animation rules after the block added in Task 1; add `animation` properties to `.apm-avatar`, `.apm-line-name`, `.apm-line-tagline`, `.apm-project-1/2/3`, `.apm-dot`)

**Interfaces:**
- Consumes: class names produced in Task 1 (`.apm-avatar`, `.apm-line-name`, `.apm-line-tagline`, `.apm-project`, `.apm-project-1/2/3`, `.apm-dot`) — this task only adds `animation` declarations to existing rules and appends new `@keyframes`, it does not rename or restructure markup.
- Produces: `@keyframes apm-avatar`, `apm-line-name`, `apm-line-tagline`, `apm-project-1`, `apm-project-2`, `apm-project-3`, `apm-dot-pulse`.

- [ ] **Step 1: Add `animation` to the existing Task-1 rules**

In `src/styles/global.css`, update these four rules (added in Task 1) to include an `animation` declaration:

```css
.apm-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, var(--av-accent), var(--av-accent-2));
  animation: apm-avatar 7s ease-in-out infinite;
}
```

```css
.apm-line-name { width: 70%; animation: apm-line-name 7s ease-in-out infinite; }
```

```css
.apm-line-tagline { width: 45%; height: 6px; animation: apm-line-tagline 7s ease-in-out infinite; }
```

```css
.apm-project {
  height: 34px; border-radius: 8px;
  background: linear-gradient(90deg, rgba(247,239,230,0.08), rgba(247,239,230,0.18), rgba(247,239,230,0.08));
  background-size: 200% 100%; opacity: 0; transform: translateY(10px);
}
.apm-project-1 { animation: apm-project-1 7s ease-in-out infinite; }
.apm-project-2 { animation: apm-project-2 7s ease-in-out infinite; }
.apm-project-3 { animation: apm-project-3 7s ease-in-out infinite; }
```

```css
.apm-dot { width: 6px; height: 6px; border-radius: 50%; background: #7BC67E; animation: apm-dot-pulse 1.6s ease-in-out infinite; }
```

- [ ] **Step 2: Append the keyframes and the reduced-motion static-state override**

Add this new block right after the CSS added in Task 1 (still inside `src/styles/global.css`, before the `/* ---------- Admin dark mode ---------- */` section is fine, or at the end of the file):

```css
@keyframes apm-avatar {
  0%, 100% { opacity: 0; transform: scale(0.6); }
  8%, 82% { opacity: 1; transform: scale(1); }
  92% { opacity: 0; transform: scale(0.6); }
}
@keyframes apm-line-name {
  0%, 12% { width: 0; opacity: 0; }
  20%, 80% { width: 70%; opacity: 1; }
  90%, 100% { width: 0; opacity: 0; }
}
@keyframes apm-line-tagline {
  0%, 18% { width: 0; opacity: 0; }
  26%, 80% { width: 45%; opacity: 1; }
  90%, 100% { width: 0; opacity: 0; }
}
@keyframes apm-project-1 {
  0%, 30% { opacity: 0; transform: translateY(10px); background-position: 200% 0; }
  38%, 78% { opacity: 1; transform: translateY(0); background-position: -200% 0; }
  88%, 100% { opacity: 0; transform: translateY(10px); }
}
@keyframes apm-project-2 {
  0%, 38% { opacity: 0; transform: translateY(10px); background-position: 200% 0; }
  46%, 78% { opacity: 1; transform: translateY(0); background-position: -200% 0; }
  88%, 100% { opacity: 0; transform: translateY(10px); }
}
@keyframes apm-project-3 {
  0%, 46% { opacity: 0; transform: translateY(10px); background-position: 200% 0; }
  54%, 78% { opacity: 1; transform: translateY(0); background-position: -200% 0; }
  88%, 100% { opacity: 0; transform: translateY(10px); }
}
@keyframes apm-dot-pulse {
  0%, 100% { opacity: 0.4; box-shadow: 0 0 0 0 rgba(123,198,126,0.5); }
  50% { opacity: 1; box-shadow: 0 0 0 4px rgba(123,198,126,0); }
}

@media (prefers-reduced-motion: reduce) {
  .apm-avatar { opacity: 1; transform: scale(1); }
  .apm-line-name { opacity: 1; width: 70%; }
  .apm-line-tagline { opacity: 1; width: 45%; }
  .apm-project { opacity: 1; transform: translateY(0); }
  .apm-dot { opacity: 1; box-shadow: none; }
}
```

This last media query only sets the properties this task's animations touch (`opacity`, `width`, `transform`, `box-shadow`) to their fully-assembled values. It does not need `!important`: the existing global rule at `src/styles/global.css:340-342` (`.adm-shell * { animation: none !important; transition: none !important; }`) already disables the `animation` property itself under reduced motion, and nothing else in the cascade sets these specific properties for these classes outside of the keyframes — so this override is what determines the visible end-state once the animation is turned off.

- [ ] **Step 3: Verify the animation runs and loops**

With the dev server still running (`preview_start` reused from Task 1, or start fresh), navigate to the login page and:
- Take a `computer` screenshot, wait 2–3 seconds, take another — confirm the mock's visible elements differ between the two screenshots (e.g. project blocks appearing/disappearing, avatar fading), showing the animation is progressing.
- Use `read_console_messages` to confirm no errors were introduced.
- Read `src/styles/global.css` back and confirm the reduced-motion override block is present and matches Step 2 (code review substitute for reduced-motion emulation, since the Browser pane tools have no `prefers-reduced-motion` emulation control).

Expected: mock visibly animates in the two screenshots; no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: animate the portfolio mock in the auth visual pane"
```
