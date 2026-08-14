# Layout de estudio: sidebar persistente + preview fijo en el editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los 3 tabs de pantalla completa del editor (`sections`/`design`/`preview`) por un layout persistente de 2 columnas: sidebar a la izquierda (sub-tabs Secciones/Diseño) y preview del portfolio siempre visible a la derecha.

**Architecture:** Primero se trae a `master` el trabajo ya terminado de la Etapa 2 (`SectionsContentTab`, branch `worktree-editor-sections-content-merge`). Luego se reestructura `EditorPage.jsx`: se elimina el estado `tab` de página y su fila de tabs en el header, se agrega un estado `sidebarTab` local que decide qué se muestra dentro de un `<aside>` fijo, y `PreviewTab` se monta siempre en un panel hermano al lado, fuera de cualquier condicional de tab.

**Tech Stack:** React 18 (hooks), CSS plano con el sistema de tokens `--a-*` existente, `lucide-react` para íconos.

## Global Constraints

- No hay framework de testing en el proyecto. Verificación: `npm run build` pasando + revisión manual con `npm run dev`.
- No se agregan dependencias nuevas.
- No se toca `SectionsContentTab.jsx`, `DesignTab.jsx`, `PreviewTab.jsx`, `ContentForm.jsx` ni ningún form individual internamente — solo su punto de montaje en `EditorPage.jsx`.
- No se rediseña el top-bar global de la app (branding, buscador, nav Dashboard/Community/Support) — fuera de alcance.
- No se toca `DashboardPage.jsx`, `LoginPage.jsx` ni `.adm-sidebar` (clase del sidebar del dashboard, distinta y no reutilizada aquí).
- Reutilizar tokens CSS existentes (`--a-border`, `--a-panel`, `--a-bg`, `--a-muted`, `--a-accent`, `--a-duration-fast`, `--a-ease`) — no inventar valores nuevos.

---

## Task 1: Mergear la Etapa 2 (`SectionsContentTab`) a `master`

**Files:**
- Merge de branch: `worktree-editor-sections-content-merge` → `master` (trae `src/components/admin/SectionsContentTab.jsx`, elimina `src/components/admin/SectionsTab.jsx` y `src/components/admin/ContentTab.jsx`, modifica `src/pages/EditorPage.jsx` y `src/styles/global.css`).

**Interfaces:**
- Produces: `SectionsContentTab({ sections, onToggle, onMove, onUpdateContent })` disponible en `src/components/admin/SectionsContentTab.jsx`, consumido por Task 2.

- [ ] **Step 1: Confirmar que el working tree está limpio**

Run: `git status`
Expected: `nada para hacer commit, el árbol de trabajo está limpio` (rama `master`).

- [ ] **Step 2: Mergear el branch**

```bash
git merge worktree-editor-sections-content-merge --no-edit
```

Expected: merge sin conflictos (fast-forward o merge commit automático). El diff ya fue verificado manualmente: solo toca `src/pages/EditorPage.jsx` (reemplaza `SectionsTab`+`ContentTab` por `SectionsContentTab`, quita el import de `FileText`, quita `content` de `TAB_LABELS` y el botón "Contenido" del nav), agrega `src/components/admin/SectionsContentTab.jsx`, elimina `src/components/admin/SectionsTab.jsx` y `src/components/admin/ContentTab.jsx`, y agrega estilos `.adm-section-block`/`.adm-section-expand-btn`/`.adm-section-block-body` a `src/styles/global.css`.

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificar que no quedan referencias a los componentes viejos**

Run: `grep -rn "SectionsTab\|ContentTab" src/`
Expected: sin resultados (o solo coincidencias de `SectionsContentTab`, que contiene la substring `ContentTab` — revisar que no haya imports rotos a `SectionsTab.jsx`/`ContentTab.jsx` sueltos).

No se requiere commit adicional en este paso — el merge ya crea su propio commit en `master`.

---

## Task 2: Reestructurar `EditorPage.jsx` al layout sidebar + preview

**Files:**
- Modify: `src/pages/EditorPage.jsx`

**Interfaces:**
- Consumes: `SectionsContentTab` (Task 1), `DesignTab` (`./components/admin/DesignTab.jsx`, ya existe, sin cambios), `PreviewTab` (`./components/admin/PreviewTab.jsx`, ya existe, sin cambios).
- Produces: `EditorPage` sin el estado `tab`/`TAB_LABELS`; nuevo estado local `sidebarTab` (`'sections' | 'design'`).

- [ ] **Step 1: Quitar `TAB_LABELS` y el subtítulo del header**

En `src/pages/EditorPage.jsx`, eliminar la línea:

```jsx
const TAB_LABELS = { sections: 'Secciones', design: 'Diseño', preview: 'Vista previa' };
```

Y dentro de `.adm-brand-block`, eliminar la línea del subtítulo:

```jsx
          <span className="adm-header-context">Editando: {TAB_LABELS[tab]}</span>
```

Dejando `.adm-brand-block` con solo:

```jsx
        <div className="adm-brand-block">
          <div className="adm-brand"><span className="adm-brand-mark">$</span> {portfolio.title}</div>
        </div>
```

- [ ] **Step 2: Reemplazar el estado `tab` por `sidebarTab`**

Reemplazar:

```jsx
  const [tab, setTab] = useState('sections');
```

por:

```jsx
  const [sidebarTab, setSidebarTab] = useState('sections');
```

- [ ] **Step 3: Quitar la fila de tabs del header**

Eliminar el bloque completo:

```jsx
        <nav className="adm-tabs">
          <button className={tab === 'sections' ? 'is-active' : ''} onClick={() => setTab('sections')}><Layers size={14} /> Secciones</button>
          <button className={tab === 'design' ? 'is-active' : ''} onClick={() => setTab('design')}><Palette size={14} /> Diseño</button>
          <button className={tab === 'preview' ? 'is-active' : ''} onClick={() => setTab('preview')}><Eye size={14} /> Vista previa</button>
        </nav>
```

(No reemplaza por nada — el header queda sin nav entre `.adm-brand-block` y `.adm-header-actions`.)

- [ ] **Step 4: Actualizar el import de íconos**

Reemplazar:

```jsx
import { Layers, Palette, Eye, ExternalLink, ArrowLeft } from 'lucide-react';
```

por (se mantienen `Layers`/`Palette` para el sub-nav del sidebar, se quita `Eye` que ya no se usa en ningún lado):

```jsx
import { Layers, Palette, ExternalLink, ArrowLeft } from 'lucide-react';
```

- [ ] **Step 5: Reemplazar `<main className="adm-main">` por el layout de 2 columnas**

Reemplazar:

```jsx
      <main className="adm-main">
        {tab === 'sections' && (
          <SectionsContentTab
            sections={portfolio.sections}
            onToggle={toggleSection}
            onMove={moveSection}
            onUpdateContent={updateSectionContent}
          />
        )}
        {tab === 'design' && <DesignTab sections={portfolio.sections} theme={portfolio.theme} onVariantChange={setVariant} onThemeChange={setTheme} />}
        {tab === 'preview' && (
          <PreviewTab sections={portfolio.sections} theme={portfolio.theme} viewport={viewport} onViewportChange={setViewport} />
        )}
      </main>
```

por:

```jsx
      <div className="adm-studio-body">
        <aside className="adm-studio-sidebar">
          <nav className="adm-studio-subtabs">
            <button className={sidebarTab === 'sections' ? 'is-active' : ''} onClick={() => setSidebarTab('sections')}>
              <Layers size={14} /> Secciones
            </button>
            <button className={sidebarTab === 'design' ? 'is-active' : ''} onClick={() => setSidebarTab('design')}>
              <Palette size={14} /> Diseño
            </button>
          </nav>
          {sidebarTab === 'sections' && (
            <SectionsContentTab
              sections={portfolio.sections}
              onToggle={toggleSection}
              onMove={moveSection}
              onUpdateContent={updateSectionContent}
            />
          )}
          {sidebarTab === 'design' && (
            <DesignTab sections={portfolio.sections} theme={portfolio.theme} onVariantChange={setVariant} onThemeChange={setTheme} />
          )}
        </aside>
        <div className="adm-studio-preview">
          <PreviewTab sections={portfolio.sections} theme={portfolio.theme} viewport={viewport} onViewportChange={setViewport} />
        </div>
      </div>
```

- [ ] **Step 6: Verificar build**

Run: `npm run build`
Expected: sin errores. Si falla por `tab`/`TAB_LABELS` no definidos, revisar que no haya quedado ninguna referencia suelta (`grep -n "TAB_LABELS\|setTab(\|tab ===" src/pages/EditorPage.jsx` debe no devolver nada).

- [ ] **Step 7: Commit**

```bash
git add src/pages/EditorPage.jsx
git commit -m "feat: replace editor full-screen tabs with persistent sidebar+preview layout"
```

---

## Task 3: Estilos del layout de estudio

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: clases `.adm-studio-body`, `.adm-studio-sidebar`, `.adm-studio-subtabs`, `.adm-studio-preview`, consumidas por el JSX de Task 2 (ya escrito y commiteado; este task solo agrega el CSS que le da estilo).

- [ ] **Step 1: Agregar las clases del layout**

En `src/styles/global.css`, agregar después del bloque `.adm-preview-frame.is-mobile { max-width: 380px; }` (buscar esa línea; en el archivo pre-Task-1 está en la línea 158, pero puede haber corrido por el merge de Task 1 — ubicarla con `grep -n "adm-preview-frame.is-mobile" src/styles/global.css` antes de editar):

```css

.adm-studio-body { display: flex; flex: 1; min-height: 0; }

.adm-studio-sidebar {
  width: 360px; flex-shrink: 0; border-right: 1px solid var(--a-border);
  background: var(--a-panel); overflow-y: auto; padding: 20px 18px 40px;
}
.adm-studio-subtabs { display: flex; gap: 4px; margin-bottom: 18px; }
.adm-studio-subtabs button {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border: none;
  background: transparent; color: var(--a-muted); font-size: 13px; font-weight: 500;
  border-radius: 7px; cursor: pointer; font-family: var(--font-body);
  transition: background var(--a-duration-fast) var(--a-ease), color var(--a-duration-fast) var(--a-ease);
}
.adm-studio-subtabs button:hover { background: var(--a-bg); color: var(--a-text); }
.adm-studio-subtabs button.is-active { background: #F4E3D8; color: #A8501F; }

.adm-studio-preview {
  flex: 1; min-width: 0; overflow-y: auto; background: var(--a-bg); padding: 28px 24px;
}

@media (max-width: 900px) {
  .adm-studio-body { flex-direction: column; }
  .adm-studio-sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--a-border); overflow-y: visible; }
  .adm-studio-preview { overflow-y: visible; }
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 3: Verificación manual — desktop**

Run: `npm run dev`, abrir `/editor/<id>` de un portfolio existente (viewport de escritorio, >900px de ancho).
Expected:
- El header no muestra tabs ni el subtítulo "Editando: X"; sí muestra "Volver al panel", nombre del portfolio, `ThemeToggle`, "Ver publicado" (si está publicado) y "Publicar".
- A la izquierda, un sidebar de ~360px con 2 sub-tabs: "Secciones" (activo por defecto) y "Diseño".
- "Secciones" muestra el acordeón de `SectionsContentTab` (toggles, flechas de reorder, contenido inline).
- A la derecha, el preview del portfolio (`PreviewTab`) con su toggle Escritorio/Móvil, visible todo el tiempo.
- Cambiar a "Diseño" en el sidebar: el panel de colores/variantes aparece en el sidebar, el preview de la derecha no se mueve ni pierde su estado (viewport seleccionado).
- Editar un campo de contenido, activar/desactivar/reordenar una sección, o cambiar el tema/variante: el preview de la derecha refleja el cambio en vivo y el indicador de guardado del header se activa ("Guardando…" → "Guardado hace unos segundos").

- [ ] **Step 4: Verificación manual — mobile**

Redimensionar la ventana (o usar las dev tools) a un ancho menor a 900px.
Expected: el sidebar pasa a ocupar el ancho completo arriba, el preview queda debajo, y toda la página scrollea de forma normal (sin recortes ni doble scroll-bar).

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add studio layout styles for editor sidebar+preview"
```

---

## Self-Review Notes

- **Cobertura del spec:** Sección "1. Merge de Etapa 2" → Task 1. Sección "2. EditorPage.jsx" (estado, header, cuerpo, imports) → Task 2, Steps 1-5. Sección "3. CSS" → Task 3. Verificación (desktop, cambio de sub-tab, edición en vivo, responsive) → Task 3, Steps 3-4.
- **Placeholders:** ninguno — todo el código de cada step está completo y es el diff exacto a aplicar.
- **Consistencia de nombres/tipos:** `sidebarTab` se declara en Task 2 Step 2 y se usa consistentemente en Step 5 (`'sections' | 'design'`, mismos dos valores en el sub-nav y en los condicionales). Las props de `SectionsContentTab`/`DesignTab`/`PreviewTab` usadas en Task 2 Step 5 coinciden exactamente con las firmas ya existentes en el código (`toggleSection`, `moveSection`, `updateSectionContent`, `setVariant`, `setTheme`, `viewport`/`setViewport`, todas ya definidas en `EditorPage.jsx` antes de este plan, sin cambios). Las clases CSS referenciadas en el JSX de Task 2 (`adm-studio-body`, `adm-studio-sidebar`, `adm-studio-subtabs`, `adm-studio-preview`) coinciden exactamente con las definidas en Task 3.
