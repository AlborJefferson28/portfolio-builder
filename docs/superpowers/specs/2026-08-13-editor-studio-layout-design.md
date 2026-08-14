# Layout de estudio: sidebar persistente + preview fijo en el editor

## Contexto

Etapa 3 de 4 hacia el mockup de referencia "Portfolio Studio". Etapa 1 (header con autosave persistente) y Etapa 2 (fusión de Secciones+Contenido en un panel acordeón, componente `SectionsContentTab`) ya están implementadas — Etapa 2 vive en el branch `worktree-editor-sections-content-merge`, aún no mergeado a `master`.

Hoy `EditorPage.jsx` usa 3 tabs excluyentes de pantalla completa (`sections`, `design`, `preview`): activar el tab "Vista previa" reemplaza por completo el panel de edición. El mockup de referencia muestra un layout de dos columnas persistente: un sidebar a la izquierda con todas las opciones de edición, y el preview del portfolio siempre visible a la derecha, sin necesidad de cambiar de tab para verlo.

## Alcance

- Mergea el branch `worktree-editor-sections-content-merge` a `master` primero (trae `SectionsContentTab`, que reemplaza a `SectionsTab`+`ContentTab`).
- Reestructura `EditorPage.jsx`: el área bajo el header pasa de 3 tabs de pantalla completa a un layout de 2 columnas persistente (sidebar + preview).
- El sidebar tiene 2 sub-tabs internos: "Secciones" (`SectionsContentTab`) y "Diseño" (`DesignTab`) — mismos componentes que hoy, sin cambios internos, solo cambia dónde se montan.
- El preview (`PreviewTab`, sin cambios internos) se monta siempre, fuera del sidebar, independiente del sub-tab activo.
- El header pierde la fila de tabs (`<nav className="adm-tabs">`) y el subtítulo "Editando: {tab}" (ya no hay un "tab activo" de página que mostrar). Mantiene sin cambios: botón "Volver al panel", nombre + indicador de guardado relativo, `ThemeToggle`, link "Ver publicado", botón "Publicar".
- **No** toca `SectionsContentTab.jsx`, `DesignTab.jsx`, `PreviewTab.jsx`, `ContentForm.jsx` ni ningún form individual internamente — solo su punto de montaje en `EditorPage.jsx`.
- **No** rediseña el top-bar global de la app (branding "Portfolio Studio", buscador, nav Dashboard/Community/Support) — eso queda fuera de alcance, es un cambio de toda la app, no solo del editor.
- **No** toca `DashboardPage.jsx`, `LoginPage.jsx` ni sus estilos (`.adm-sidebar` del dashboard es una clase distinta, no se reutiliza ni se modifica).

## Diseño

### 1. Merge de Etapa 2

Mergear `worktree-editor-sections-content-merge` a `master` sin conflictos esperados (ambos branches comparten el mismo ancestro reciente). Esto trae `src/components/admin/SectionsContentTab.jsx` y elimina `SectionsTab.jsx`/`ContentTab.jsx`, además de los estilos `.adm-section-block`/`.adm-section-expand-btn`/`.adm-section-block-body` ya agregados a `global.css`.

### 2. `EditorPage.jsx`

**Estado:**
- Se elimina `tab`/`TAB_LABELS` (ya no hay tab de página).
- Se agrega `sidebarTab` (`useState('sections')`, valores `'sections' | 'design'`).
- `viewport` se mantiene sin cambios (lo sigue usando `PreviewTab`).

**Header** (`<header className="adm-header">`):
- Se elimina el bloque `<nav className="adm-tabs">…</nav>` completo.
- Se elimina `<span className="adm-header-context">Editando: {TAB_LABELS[tab]}</span>` de `.adm-brand-block` (queda solo el `.adm-brand` con el título).
- El resto del header (`Volver al panel`, `ThemeToggle`, indicador de guardado, `Ver publicado`, `Publicar`) no cambia de posición ni de lógica.
- Import de íconos: se quitan `Layers`, `FileText`, `Palette`, `Eye` (ya no se usan en el header); `Palette`/`Eye` se reimportan donde haga falta para los botones del sub-nav del sidebar (ver abajo).

**Cuerpo** (reemplaza `<main className="adm-main">…</main>`):

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

`Layers` se reimporta (se usaba antes para el tab de header, ahora para el sub-tab del sidebar). `Eye` ya no se usa en ningún lado (el ícono del tab "Vista previa" desaparece junto con el tab) y se quita del import.

### 3. CSS (`src/styles/global.css`)

Se agrega después del bloque `.adm-preview-frame.is-mobile` (línea 158):

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

`.adm-main` (línea 65, `max-width:760px; margin:auto`, pensado para el layout de un solo tab centrado) deja de usarse en `EditorPage.jsx` — no se elimina del CSS porque no rompe nada al quedar sin referencias, pero no se reutiliza en este cambio.

El scroll independiente de sidebar/preview depende de que `.adm-shell` (`min-height:100vh; display:flex; flex-direction:column`) le dé una altura resuelta a `.adm-studio-body` vía `flex:1`; `min-height:0` en `.adm-studio-body` es necesario para que `overflow-y:auto` en sus hijos funcione en vez de expandirse con el contenido (comportamiento por defecto de flexbox).

## Testing / verificación

- Merge: `npm run build` pasa después de traer `worktree-editor-sections-content-merge` a `master`.
- Abrir `/editor/<id>`: el header ya no muestra tabs ni el subtítulo "Editando: X"; sí muestra volver, nombre+guardado, tema, ver publicado (si está publicado), publicar.
- El sidebar muestra sub-tabs "Secciones"/"Diseño"; "Secciones" arranca activo mostrando el acordeón de `SectionsContentTab`.
- El preview a la derecha muestra el portfolio y su toggle Escritorio/Móvil, visible sin importar qué sub-tab del sidebar esté activo.
- Cambiar de sub-tab a "Diseño": el preview no se mueve ni desmonta (el toggle de viewport conserva su valor).
- Editar contenido, activar/desactivar/reordenar secciones, cambiar tema/variante: el preview refleja los cambios en vivo (ya sucede hoy vía props compartidas, no debería romperse) y el autosave del header sigue disparando igual.
- Redimensionar el navegador por debajo de ~900px: sidebar y preview se apilan verticalmente, la página entera scrollea normalmente (sin recortes ni scroll doble).
- No hay tests automatizados en el proyecto; verificación puramente manual, igual que specs previos.
