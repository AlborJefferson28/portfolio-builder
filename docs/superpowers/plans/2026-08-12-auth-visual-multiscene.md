# Auth Visual Multi-Scene Mock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the login page's single-scene portfolio mock animation with a 5-scene looping mock that narrates the app's real editing flow (Secciones → Contenido → Diseño → Vista previa → Publicar), plus a 5-dot scene indicator.

**Architecture:** All 5 scenes are absolutely-positioned sibling `<div>`s stacked inside the same `.auth-portfolio-mock` container, each with its own `@keyframes`-driven opacity fade sharing one 18s clock (0-100% maps to 0-18s), so only one scene is visible at a time without any JS. This extends the exact mechanism already used by the current `.apm-project-1/2/3` staggered reveal (same duration, different keyframe offsets per element) — no new animation technique is introduced, just applied to five larger groups instead of three small ones.

**Tech Stack:** React 18 (JSX), plain CSS (`src/styles/global.css`), Vite dev server for manual verification via the Browser pane.

## Global Constraints

- Total loop duration: **18s**, split into 5 equal 20%-wide windows, one per scene: Secciones 0–20%, Contenido 20–40%, Diseño 40–60%, Vista previa 60–80%, Publicar 80–100%.
- Only CSS/`<div>`s — no images, video, or icon library (`lucide-react` is available in the project but must NOT be added to this decorative mock; keep the existing plain-`<div>` vocabulary).
- `.auth-portfolio-mock` and the new `.apm-dots` indicator are purely decorative and must carry `aria-hidden="true"` (matches the existing mock's current attribute).
- The layout (`.auth-split`, `.auth-form-pane`, `.auth-visual-pane`), the form logic, and the fixed panel text (`.auth-visual-eyebrow`, `.auth-visual-title`) do not change in this plan — only the contents of `.auth-portfolio-mock` and a new `.apm-dots` element next to it change.
- `prefers-reduced-motion: reduce` must show a static assembled end-state: all scenes hidden except the Publicar scene (final state of the whole flow), and dot indicator 5 shown as active — not a random mid-animation frame. This follows the same pattern already established for the mock's previous single-scene reduced-motion override.
- No automated test suite exists in this project — verification is manual, via the Browser pane against the Vite dev server (`portfolio-builder-dev`, port 5173, `.claude/launch.json`). The Browser pane in this environment does not reliably composite animation frames when not actively displayed (confirmed in a prior session), so runtime verification of animation progress should rely on computed-style/`getComputedStyle` inspection (`animation-name`, `animation-duration`) plus careful reading of the final CSS, not on comparing timed screenshots.
- `src/pages/LoginPage.jsx` changes only within the `.auth-visual-pane` block (Task 1) — Task 2 is CSS-only in `src/styles/global.css` and must not touch `LoginPage.jsx`, reusing the exact class names Task 1 puts in the markup.

---

### Task 1: Multi-scene markup and static structural CSS

**Files:**
- Modify: `src/pages/LoginPage.jsx` (replace the `.auth-portfolio-mock` block inside `.auth-visual-pane`, lines 78–92)
- Modify: `src/styles/global.css:221-296` (replace the entire single-scene mock CSS block, from `.auth-portfolio-mock` through the end of its `@media (prefers-reduced-motion: reduce)` block, with new structural CSS — no `@keyframes`/`animation` yet except the pre-existing `apm-dot-pulse`, which is reused unchanged)

**Interfaces:**
- Consumes: `.auth-visual-pane`, `.auth-visual-eyebrow`, `.auth-visual-title` (unchanged, defined earlier in `global.css`, not touched by this task).
- Produces (exact class names Task 2 will attach `animation` properties to — do not rename): `.apm-mock-group`, `.apm-scene`, `.apm-scene-sections`, `.apm-scene-content`, `.apm-scene-design`, `.apm-scene-preview`, `.apm-scene-publish`, `.apm-spill`, `.apm-spill-3`, `.apm-spill-4`, `.apm-cinput`, `.apm-cinput-1`, `.apm-cinput-2`, `.apm-swatch`, `.apm-swatch-1`, `.apm-swatch-2`, `.apm-swatch-3`, `.apm-device-hero`, `.apm-device-card`, `.apm-device-card-1`, `.apm-device-card-2`, `.apm-dots`, `.apm-dot-indicator`, `.apm-dot-indicator-1` through `.apm-dot-indicator-5`. Also keeps `.apm-chip`, `.apm-dot`, `@keyframes apm-dot-pulse` from the previous design, unchanged.

- [ ] **Step 1: Replace the mock CSS block in `src/styles/global.css`**

Find the block starting at `.auth-portfolio-mock {` (current line 221) and ending at the closing `}` of the `@media (prefers-reduced-motion: reduce)` block (current line 296) — i.e. everything between the `@media (max-width: 899px)` block above it and `.dash-header` below it except that max-width media query itself. Replace it with:

```css
.auth-portfolio-mock {
  width: 260px; height: 210px; background: var(--av-bg-2); border: 1px solid rgba(247,239,230,0.12);
  border-radius: 14px; position: relative; overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.35);
}
.apm-mock-group { display: flex; flex-direction: column; align-items: center; gap: 14px; }

.apm-scene {
  position: absolute; inset: 20px; display: flex; flex-direction: column; gap: 10px;
  opacity: 0;
}
.apm-scene-preview, .apm-scene-publish { align-items: center; justify-content: center; }
.apm-scene-sections { opacity: 1; }

.apm-line { height: 8px; border-radius: 4px; background: rgba(247,239,230,0.25); }

/* Escena 1: Secciones */
.apm-srow { display: flex; align-items: center; gap: 10px; }
.apm-sline { width: 55%; }
.apm-spill { width: 20px; height: 11px; border-radius: 999px; background: rgba(247,239,230,0.18); flex-shrink: 0; }
.apm-spill.is-on { background: var(--av-accent-2); }

/* Escena 2: Contenido */
.apm-crow { display: flex; flex-direction: column; gap: 6px; }
.apm-cline-label { width: 30%; height: 6px; opacity: 0.6; }
.apm-cinput { height: 10px; border-radius: 4px; background: rgba(247,239,230,0.22); width: 90%; transform-origin: left; transform: scaleX(0); }

/* Escena 3: Diseño */
.apm-swatches { display: flex; gap: 12px; }
.apm-swatch { width: 18px; height: 18px; border-radius: 50%; box-shadow: 0 0 0 2px transparent; }
.apm-swatch-1 { background: var(--av-accent-2); }
.apm-swatch-2 { background: #7BA88F; }
.apm-swatch-3 { background: #7C93C4; }
.apm-dline { width: 50%; margin-top: 4px; opacity: 0.5; }

/* Escena 4: Vista previa */
.apm-device {
  width: 92px; border: 1px solid rgba(247,239,230,0.25); border-radius: 14px; padding: 10px 8px;
  display: flex; flex-direction: column; gap: 6px;
}
.apm-device-hero { height: 16px; border-radius: 4px; background: rgba(247,239,230,0.3); opacity: 0; }
.apm-device-card { height: 20px; border-radius: 4px; background: rgba(247,239,230,0.16); opacity: 0; }

/* Escena 5: Publicar */
.apm-chip {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); font-size: 11px; color: var(--av-muted);
  border: 1px solid rgba(247,239,230,0.15); border-radius: 999px; padding: 4px 10px; margin-top: 4px;
}
.apm-dot { width: 6px; height: 6px; border-radius: 50%; background: #7BC67E; animation: apm-dot-pulse 1.6s ease-in-out infinite; }

@keyframes apm-dot-pulse {
  0%, 100% { opacity: 0.4; box-shadow: 0 0 0 0 rgba(123,198,126,0.5); }
  50% { opacity: 1; box-shadow: 0 0 0 4px rgba(123,198,126,0); }
}

/* Indicador de escena */
.apm-dots { display: flex; gap: 6px; }
.apm-dot-indicator { width: 5px; height: 5px; border-radius: 50%; background: var(--av-muted); opacity: 0.4; }
.apm-dot-indicator-1 { opacity: 1; background: var(--av-accent); }

@media (max-width: 899px) {
  .auth-split { grid-template-columns: 1fr; }
  .auth-visual-pane { display: none; }
}
```

Note: the `@media (max-width: 899px)` block is unchanged content-wise, just repositioned at the end of this replacement so it stays directly above `.dash-header` as it does today.

- [ ] **Step 2: Replace the mock markup in `src/pages/LoginPage.jsx`**

Replace this block (current lines 78–92):

```jsx
      <div className="auth-visual-pane">
        <div className="auth-portfolio-mock" aria-hidden="true">
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
```

With:

```jsx
      <div className="auth-visual-pane">
        <div className="apm-mock-group">
          <div className="auth-portfolio-mock" aria-hidden="true">
            <div className="apm-scene apm-scene-sections">
              <div className="apm-srow"><span className="apm-spill is-on" /><span className="apm-line apm-sline" /></div>
              <div className="apm-srow"><span className="apm-spill is-on" /><span className="apm-line apm-sline" /></div>
              <div className="apm-srow"><span className="apm-spill apm-spill-3" /><span className="apm-line apm-sline" /></div>
              <div className="apm-srow"><span className="apm-spill apm-spill-4" /><span className="apm-line apm-sline" /></div>
            </div>
            <div className="apm-scene apm-scene-content">
              <div className="apm-crow">
                <span className="apm-line apm-cline-label" />
                <span className="apm-cinput apm-cinput-1" />
              </div>
              <div className="apm-crow">
                <span className="apm-line apm-cline-label" />
                <span className="apm-cinput apm-cinput-2" />
              </div>
            </div>
            <div className="apm-scene apm-scene-design">
              <div className="apm-swatches">
                <span className="apm-swatch apm-swatch-1" />
                <span className="apm-swatch apm-swatch-2" />
                <span className="apm-swatch apm-swatch-3" />
              </div>
              <span className="apm-line apm-dline" />
            </div>
            <div className="apm-scene apm-scene-preview">
              <div className="apm-device">
                <span className="apm-device-hero" />
                <span className="apm-device-card apm-device-card-1" />
                <span className="apm-device-card apm-device-card-2" />
              </div>
            </div>
            <div className="apm-scene apm-scene-publish">
              <div className="apm-chip"><span className="apm-dot" /> Publicado</div>
            </div>
          </div>
          <div className="apm-dots" aria-hidden="true">
            <span className="apm-dot-indicator apm-dot-indicator-1" />
            <span className="apm-dot-indicator apm-dot-indicator-2" />
            <span className="apm-dot-indicator apm-dot-indicator-3" />
            <span className="apm-dot-indicator apm-dot-indicator-4" />
            <span className="apm-dot-indicator apm-dot-indicator-5" />
          </div>
        </div>
        <p className="auth-visual-eyebrow">$ tu-portfolio</p>
        <h2 className="auth-visual-title">Creá y personalizá tu portfolio público en minutos</h2>
      </div>
```

Nothing else in `LoginPage.jsx` changes — the form pane, imports, and handlers stay exactly as they are.

- [ ] **Step 3: Verify the static structure in the browser**

Start the dev server (`preview_start` with `{"name": "portfolio-builder-dev"}`) and navigate to `/login` at desktop width (>=900px, use `resize_window` preset `desktop`).

Verify with `read_page` / `get_page_text` / `javascript_tool`:
- The visual pane shows the Secciones scene by default (4 rows, first 2 "pills" colored/on, last 2 muted/off) — since no animation exists yet in this task, this is the only scene visible (the other four have `opacity: 0` with no animation to reveal them, which is expected at this point).
- Below the mock, 5 small dots are present, with the first one visibly brighter/accented than the other 4 (`.apm-dot-indicator-1` has the static `opacity:1; background: var(--av-accent)` override from Step 1).
- `read_console_messages` shows no errors.
- Confirm no stray reference to the removed classes remains: run `grep -n "apm-avatar\|apm-projects\|apm-project-1\|apm-line-name\|apm-line-tagline" src/pages/LoginPage.jsx src/styles/global.css` — expect no matches.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LoginPage.jsx src/styles/global.css
git commit -m "feat: restructure auth mock into 5-scene markup with static Secciones state"
```

---

### Task 2: Loop animation for all 5 scenes and the dot indicator

**Files:**
- Modify: `src/styles/global.css` (add `animation` properties to rules Task 1 created, add new `animation` rules for the dot indicators, append `@keyframes` for all scenes/elements, append the reduced-motion override)

**Interfaces:**
- Consumes: every class name listed in Task 1's "Produces" section — this task only adds `animation` declarations and new `@keyframes`, it does not rename or restructure any selector or touch `LoginPage.jsx`.
- Produces: `@keyframes apm-scene-sections`, `apm-scene-content`, `apm-scene-design`, `apm-scene-preview`, `apm-scene-publish`, `apm-spill-3`, `apm-spill-4`, `apm-cinput-1`, `apm-cinput-2`, `apm-swatch-1`, `apm-swatch-2`, `apm-swatch-3`, `apm-device-hero`, `apm-device-card-1`, `apm-device-card-2`, `apm-dot-indicator-1` through `apm-dot-indicator-5`.

- [ ] **Step 1: Attach `animation` to the scene-visibility rules**

In `src/styles/global.css`, change the `.apm-scene-sections` rule from Task 1:

```css
.apm-scene-sections { opacity: 1; }
```

to:

```css
.apm-scene-sections { animation: apm-scene-sections 18s ease-in-out infinite; }
```

Then add these four new rules right after it (there is no static equivalent for these in Task 1 — they were invisible by default via the base `.apm-scene { opacity: 0; }` rule):

```css
.apm-scene-content { animation: apm-scene-content 18s ease-in-out infinite; }
.apm-scene-design { animation: apm-scene-design 18s ease-in-out infinite; }
.apm-scene-preview { animation: apm-scene-preview 18s ease-in-out infinite; }
.apm-scene-publish { animation: apm-scene-publish 18s ease-in-out infinite; }
```

- [ ] **Step 2: Attach `animation` to the per-element rules within each scene**

Update these existing Task-1 rules to add an `animation` declaration (keep every other property unchanged):

```css
.apm-spill-3 { animation: apm-spill-3 18s ease-in-out infinite; }
.apm-spill-4 { animation: apm-spill-4 18s ease-in-out infinite; }
```

```css
.apm-swatch-1 { background: var(--av-accent-2); animation: apm-swatch-1 18s ease-in-out infinite; }
.apm-swatch-2 { background: #7BA88F; animation: apm-swatch-2 18s ease-in-out infinite; }
.apm-swatch-3 { background: #7C93C4; animation: apm-swatch-3 18s ease-in-out infinite; }
```

Add these new rules (Task 1 gave `.apm-cinput`, `.apm-device-hero`, `.apm-device-card` their base look but the `-1`/`-2` modifiers didn't exist as separate rules yet):

```css
.apm-cinput-1 { animation: apm-cinput-1 18s ease-in-out infinite; }
.apm-cinput-2 { animation: apm-cinput-2 18s ease-in-out infinite; }
.apm-device-hero { animation: apm-device-hero 18s ease-in-out infinite; }
.apm-device-card-1 { animation: apm-device-card-1 18s ease-in-out infinite; }
.apm-device-card-2 { animation: apm-device-card-2 18s ease-in-out infinite; }
```

- [ ] **Step 3: Attach `animation` to the dot indicators**

Change the Task-1 rule:

```css
.apm-dot-indicator-1 { opacity: 1; background: var(--av-accent); }
```

to:

```css
.apm-dot-indicator-1 { animation: apm-dot-indicator-1 18s ease-in-out infinite; }
```

And add:

```css
.apm-dot-indicator-2 { animation: apm-dot-indicator-2 18s ease-in-out infinite; }
.apm-dot-indicator-3 { animation: apm-dot-indicator-3 18s ease-in-out infinite; }
.apm-dot-indicator-4 { animation: apm-dot-indicator-4 18s ease-in-out infinite; }
.apm-dot-indicator-5 { animation: apm-dot-indicator-5 18s ease-in-out infinite; }
```

- [ ] **Step 4: Append all `@keyframes` and the reduced-motion override**

Add this block right after the `@media (max-width: 899px)` block at the end of the section Task 1 created (still inside `src/styles/global.css`, before `.dash-header`):

```css
@keyframes apm-scene-sections {
  0% { opacity: 1; }
  18% { opacity: 1; }
  20% { opacity: 0; }
  96% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes apm-scene-content {
  0%, 18% { opacity: 0; }
  20% { opacity: 1; }
  38% { opacity: 1; }
  40%, 100% { opacity: 0; }
}
@keyframes apm-scene-design {
  0%, 38% { opacity: 0; }
  40% { opacity: 1; }
  58% { opacity: 1; }
  60%, 100% { opacity: 0; }
}
@keyframes apm-scene-preview {
  0%, 58% { opacity: 0; }
  60% { opacity: 1; }
  78% { opacity: 1; }
  80%, 100% { opacity: 0; }
}
@keyframes apm-scene-publish {
  0%, 78% { opacity: 0; }
  80% { opacity: 1; }
  94% { opacity: 1; }
  96%, 100% { opacity: 0; }
}

@keyframes apm-spill-3 {
  0%, 8% { background: rgba(247,239,230,0.18); }
  11%, 20% { background: var(--av-accent-2); }
  21%, 100% { background: rgba(247,239,230,0.18); }
}
@keyframes apm-spill-4 {
  0%, 14% { background: rgba(247,239,230,0.18); }
  17%, 20% { background: var(--av-accent-2); }
  21%, 100% { background: rgba(247,239,230,0.18); }
}

@keyframes apm-cinput-1 {
  0%, 24% { transform: scaleX(0); }
  30%, 40% { transform: scaleX(1); }
  41%, 100% { transform: scaleX(0); }
}
@keyframes apm-cinput-2 {
  0%, 32% { transform: scaleX(0); }
  38%, 40% { transform: scaleX(1); }
  41%, 100% { transform: scaleX(0); }
}

@keyframes apm-swatch-1 {
  0%, 40% { box-shadow: 0 0 0 2px transparent; }
  42%, 47% { box-shadow: 0 0 0 2px var(--av-text); }
  49%, 100% { box-shadow: 0 0 0 2px transparent; }
}
@keyframes apm-swatch-2 {
  0%, 47% { box-shadow: 0 0 0 2px transparent; }
  49%, 54% { box-shadow: 0 0 0 2px var(--av-text); }
  56%, 100% { box-shadow: 0 0 0 2px transparent; }
}
@keyframes apm-swatch-3 {
  0%, 54% { box-shadow: 0 0 0 2px transparent; }
  56%, 60% { box-shadow: 0 0 0 2px var(--av-text); }
  62%, 100% { box-shadow: 0 0 0 2px transparent; }
}

@keyframes apm-device-hero {
  0%, 62% { opacity: 0; }
  66%, 78% { opacity: 1; }
  80%, 100% { opacity: 0; }
}
@keyframes apm-device-card-1 {
  0%, 68% { opacity: 0; }
  72%, 78% { opacity: 1; }
  80%, 100% { opacity: 0; }
}
@keyframes apm-device-card-2 {
  0%, 72% { opacity: 0; }
  76%, 78% { opacity: 1; }
  80%, 100% { opacity: 0; }
}

@keyframes apm-dot-indicator-1 {
  0% { opacity: 1; background: var(--av-accent); }
  18% { opacity: 1; background: var(--av-accent); }
  20% { opacity: 0.4; background: var(--av-muted); }
  96% { opacity: 0.4; background: var(--av-muted); }
  100% { opacity: 1; background: var(--av-accent); }
}
@keyframes apm-dot-indicator-2 {
  0%, 18% { opacity: 0.4; background: var(--av-muted); }
  20% { opacity: 1; background: var(--av-accent); }
  38% { opacity: 1; background: var(--av-accent); }
  40%, 100% { opacity: 0.4; background: var(--av-muted); }
}
@keyframes apm-dot-indicator-3 {
  0%, 38% { opacity: 0.4; background: var(--av-muted); }
  40% { opacity: 1; background: var(--av-accent); }
  58% { opacity: 1; background: var(--av-accent); }
  60%, 100% { opacity: 0.4; background: var(--av-muted); }
}
@keyframes apm-dot-indicator-4 {
  0%, 58% { opacity: 0.4; background: var(--av-muted); }
  60% { opacity: 1; background: var(--av-accent); }
  78% { opacity: 1; background: var(--av-accent); }
  80%, 100% { opacity: 0.4; background: var(--av-muted); }
}
@keyframes apm-dot-indicator-5 {
  0%, 78% { opacity: 0.4; background: var(--av-muted); }
  80% { opacity: 1; background: var(--av-accent); }
  94% { opacity: 1; background: var(--av-accent); }
  96%, 100% { opacity: 0.4; background: var(--av-muted); }
}

@media (prefers-reduced-motion: reduce) {
  .apm-scene { animation: none; opacity: 0; }
  .apm-scene-publish { opacity: 1; }
  .apm-spill-3, .apm-spill-4, .apm-cinput-1, .apm-cinput-2,
  .apm-swatch-1, .apm-swatch-2, .apm-swatch-3,
  .apm-device-hero, .apm-device-card-1, .apm-device-card-2 { animation: none; }
  .apm-dot-indicator { animation: none; opacity: 0.4; background: var(--av-muted); }
  .apm-dot-indicator-5 { opacity: 1; background: var(--av-accent); }
  .apm-dot { animation: none; opacity: 1; box-shadow: none; }
}
```

This reduced-motion block does not need `!important`: the pre-existing global rule `.adm-shell *, .pf-scope * { animation: none !important; }` (further down in `global.css`, inside the `/* ---------- Admin dark mode ---------- */`-adjacent reduced-motion section) already forces `animation: none` on every element under `.adm-shell` — the block above only needs to additionally set the *values* (`opacity`, `background`, `box-shadow`) these animations touch, so the mock reads as "flow complete" (Publicar scene visible, dot 5 active) instead of empty.

- [ ] **Step 5: Verify the animation timeline is wired correctly**

With the dev server running, navigate to `/login` and use `javascript_tool` to inspect computed styles, since the Browser pane does not reliably composite live animation frames in this environment. For each of the following elements, confirm `getComputedStyle(el).animationName` matches the expected keyframes name and `animationDuration` is `18s` (or `1.6s` for `.apm-dot`, unchanged from Task 1):

```js
[
  ['.apm-scene-sections', 'apm-scene-sections'],
  ['.apm-scene-content', 'apm-scene-content'],
  ['.apm-scene-design', 'apm-scene-design'],
  ['.apm-scene-preview', 'apm-scene-preview'],
  ['.apm-scene-publish', 'apm-scene-publish'],
  ['.apm-spill-3', 'apm-spill-3'],
  ['.apm-spill-4', 'apm-spill-4'],
  ['.apm-cinput-1', 'apm-cinput-1'],
  ['.apm-cinput-2', 'apm-cinput-2'],
  ['.apm-swatch-1', 'apm-swatch-1'],
  ['.apm-swatch-2', 'apm-swatch-2'],
  ['.apm-swatch-3', 'apm-swatch-3'],
  ['.apm-device-hero', 'apm-device-hero'],
  ['.apm-device-card-1', 'apm-device-card-1'],
  ['.apm-device-card-2', 'apm-device-card-2'],
  ['.apm-dot-indicator-1', 'apm-dot-indicator-1'],
  ['.apm-dot-indicator-2', 'apm-dot-indicator-2'],
  ['.apm-dot-indicator-3', 'apm-dot-indicator-3'],
  ['.apm-dot-indicator-4', 'apm-dot-indicator-4'],
  ['.apm-dot-indicator-5', 'apm-dot-indicator-5'],
].map(([sel, name]) => {
  const el = document.querySelector(sel);
  const cs = el ? getComputedStyle(el) : null;
  return { sel, found: !!el, animationName: cs?.animationName, animationDuration: cs?.animationDuration, match: cs?.animationName === name };
})
```

Expected: every row has `found: true` and `match: true`.

Then re-read the full `src/styles/global.css` scene/keyframes block and confirm by inspection (no tool can emulate `prefers-reduced-motion` here):
- Every `@keyframes` block's percentage offsets are non-decreasing within the block.
- The reduced-motion block sets a value for every property each corresponding `@keyframes` animates (e.g. `.apm-swatch-1/2/3`'s reduced-motion entry should reset `box-shadow`, which it does via the shared `.apm-scene { opacity: 0 }` making the whole design scene invisible — confirm this is sufecient rather than leaving a lit ring behind).
- `read_console_messages` shows no errors.

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: animate the 5-scene auth mock and its scene indicator dots"
```
