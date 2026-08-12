# Fusión de Secciones + Contenido del Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los tabs separados "Secciones" y "Contenido" del editor por un único panel acordeón donde cada sección muestra su toggle, reorder y contenido en el mismo bloque.

**Architecture:** Un componente nuevo (`SectionsContentTab`) reemplaza a `SectionsTab` + `ContentTab`, reutilizando `ContentForm` sin cambios. Estado de expandido/colapsado vive local al componente (`useState` con un `Set` de IDs), no se persiste. `EditorPage.jsx` pierde el tab "Contenido" y pasa las 4 props combinadas al nuevo componente.

**Tech Stack:** React 18 (hooks), CSS plano con el sistema de tokens `--a-*` existente, `lucide-react` para íconos.

## Global Constraints

- No hay framework de testing en el proyecto. Verificación: `npm run build` pasando + revisión manual con `npm run dev`.
- No se agregan dependencias nuevas.
- Sin drag-and-drop (sigue siendo reorder con flechas ↑/↓) ni animación de altura al expandir/colapsar — fuera de alcance de esta etapa.
- El set de 6 tipos de sección es fijo (Hero, Sobre mí, Proyectos, Habilidades, Experiencia, Contacto) — no se agregan ni quitan tipos.
- Reutilizar tokens CSS existentes (`--a-border`, `--a-panel`, `--a-muted`, `--a-duration-fast`, `--a-ease`) — no inventar valores nuevos.
- No tocar `ContentForm.jsx`, los forms individuales (`HeroForm`, `ProjectsForm`, etc.), `DesignTab.jsx`, `PreviewTab.jsx`, ni el header del editor (ya cubierto en la Etapa 1).

---

## Task 1: Componente `SectionsContentTab`

**Files:**
- Create: `src/components/admin/SectionsContentTab.jsx`
- Modify: `src/styles/global.css` (agregar bloque nuevo después de `.adm-content-heading`, línea 94-97)

**Interfaces:**
- Produces: `SectionsContentTab({ sections, onToggle, onMove, onUpdateContent })` — componente default export. `sections`: array de `{ id, type, enabled, content, ... }`. `onToggle(sectionId, enabled)`, `onMove(index, dir)`, `onUpdateContent(sectionId, content)` — mismas firmas que ya reciben `SectionsTab`/`ContentTab` hoy en `EditorPage.jsx`. Usado por `EditorPage.jsx` (Task 2).
- Consumes: `Toggle` (`./Toggle.jsx`, ya existe), `ContentForm` (`./ContentForm.jsx`, ya existe), `SECTION_META` (`../../data/sectionMeta.js`, ya existe).

- [ ] **Step 1: Crear el componente**

```jsx
import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import Toggle from './Toggle.jsx';
import ContentForm from './ContentForm.jsx';
import { SECTION_META } from '../../data/sectionMeta.js';

export default function SectionsContentTab({ sections, onToggle, onMove, onUpdateContent }) {
  const [expandedIds, setExpandedIds] = useState(
    () => new Set(sections.filter((s) => s.enabled).map((s) => s.id)),
  );

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleSection = (id, enabled) => {
    onToggle(id, enabled);
    if (!enabled) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="adm-panel">
      <h2 className="adm-panel-title">Secciones</h2>
      <p className="adm-panel-desc">Activa, ordena y edita el contenido de cada sección.</p>
      <div className="adm-section-list">
        {sections.map((s, i) => {
          const expanded = expandedIds.has(s.id);
          return (
            <div key={s.id} className="adm-section-block">
              <div className="adm-section-row">
                <div className="adm-reorder">
                  <button type="button" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label="Mover arriba">
                    <ChevronUp size={16} />
                  </button>
                  <button type="button" disabled={i === sections.length - 1} onClick={() => onMove(i, 1)} aria-label="Mover abajo">
                    <ChevronDown size={16} />
                  </button>
                </div>
                <Toggle checked={s.enabled} onChange={(v) => handleToggleSection(s.id, v)} />
                <span className="adm-section-name">{SECTION_META[s.type].label}</span>
                <button
                  type="button"
                  className="adm-section-expand-btn"
                  onClick={() => toggleExpanded(s.id)}
                  aria-label={expanded ? 'Colapsar sección' : 'Expandir sección'}
                  aria-expanded={expanded}
                >
                  <ChevronRight size={16} className={expanded ? 'is-expanded' : ''} />
                </button>
              </div>
              {expanded && (
                <div className="adm-section-block-body">
                  <ContentForm section={s} onChange={(next) => onUpdateContent(s.id, next)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

Guardar en `src/components/admin/SectionsContentTab.jsx`.

- [ ] **Step 2: Agregar los estilos nuevos**

Agregar en `src/styles/global.css`, después del bloque `.adm-content-heading` (líneas 94-97):

```css
.adm-section-block { background: var(--a-panel); border: 1px solid var(--a-border); border-radius: 10px; overflow: hidden; }
.adm-section-block .adm-section-row { border: none; border-radius: 0; }
.adm-section-expand-btn { background: none; border: none; color: var(--a-muted); cursor: pointer; padding: 4px; border-radius: 5px; display: flex; }
.adm-section-expand-btn:hover { background: var(--a-bg); color: var(--a-text); }
.adm-section-expand-btn svg { transition: transform var(--a-duration-fast) var(--a-ease); }
.adm-section-expand-btn svg.is-expanded { transform: rotate(90deg); }
.adm-section-block-body { padding: 4px 14px 18px; }
```

(`--a-duration-fast` y `--a-ease` ya existen en el proyecto desde el sistema de tokens compartido — no son valores nuevos, solo se reutilizan para la rotación del chevron.)

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores. El componente todavía no se importa desde ningún lado (se conecta en Task 2) — eso es lo esperado, no un bug.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/SectionsContentTab.jsx src/styles/global.css
git commit -m "feat: add SectionsContentTab merging section toggles with content editing"
```

---

## Task 2: Integrar en `EditorPage` y eliminar los tabs viejos

**Files:**
- Modify: `src/pages/EditorPage.jsx`
- Delete: `src/components/admin/SectionsTab.jsx`
- Delete: `src/components/admin/ContentTab.jsx`

**Interfaces:**
- Consumes: `SectionsContentTab` (Task 1).

- [ ] **Step 1: Actualizar los imports**

En `src/pages/EditorPage.jsx`, reemplazar:

```jsx
import SectionsTab from '../components/admin/SectionsTab.jsx';
import ContentTab from '../components/admin/ContentTab.jsx';
import DesignTab from '../components/admin/DesignTab.jsx';
import PreviewTab from '../components/admin/PreviewTab.jsx';
```

por:

```jsx
import SectionsContentTab from '../components/admin/SectionsContentTab.jsx';
import DesignTab from '../components/admin/DesignTab.jsx';
import PreviewTab from '../components/admin/PreviewTab.jsx';
```

- [ ] **Step 2: Actualizar `TAB_LABELS`**

Reemplazar:

```jsx
const TAB_LABELS = { sections: 'Secciones', content: 'Contenido', design: 'Diseño', preview: 'Vista previa' };
```

por:

```jsx
const TAB_LABELS = { sections: 'Secciones', design: 'Diseño', preview: 'Vista previa' };
```

- [ ] **Step 3: Actualizar la barra de tabs**

Reemplazar el bloque `<nav className="adm-tabs">`:

```jsx
        <nav className="adm-tabs">
          <button className={tab === 'sections' ? 'is-active' : ''} onClick={() => setTab('sections')}><Layers size={14} /> Secciones</button>
          <button className={tab === 'content' ? 'is-active' : ''} onClick={() => setTab('content')}><FileText size={14} /> Contenido</button>
          <button className={tab === 'design' ? 'is-active' : ''} onClick={() => setTab('design')}><Palette size={14} /> Diseño</button>
          <button className={tab === 'preview' ? 'is-active' : ''} onClick={() => setTab('preview')}><Eye size={14} /> Vista previa</button>
        </nav>
```

por:

```jsx
        <nav className="adm-tabs">
          <button className={tab === 'sections' ? 'is-active' : ''} onClick={() => setTab('sections')}><Layers size={14} /> Secciones</button>
          <button className={tab === 'design' ? 'is-active' : ''} onClick={() => setTab('design')}><Palette size={14} /> Diseño</button>
          <button className={tab === 'preview' ? 'is-active' : ''} onClick={() => setTab('preview')}><Eye size={14} /> Vista previa</button>
        </nav>
```

(El import de íconos en la línea 3 ya incluye `FileText` — queda sin uso tras este cambio; ver Step 4.)

- [ ] **Step 4: Quitar el ícono `FileText` del import y actualizar el render de tabs**

Reemplazar la línea de import de íconos:

```jsx
import { Layers, FileText, Palette, Eye, ExternalLink, ArrowLeft } from 'lucide-react';
```

por:

```jsx
import { Layers, Palette, Eye, ExternalLink, ArrowLeft } from 'lucide-react';
```

Y reemplazar el bloque de render de tabs (dentro de `<main className="adm-main">`):

```jsx
        {tab === 'sections' && <SectionsTab sections={portfolio.sections} onToggle={toggleSection} onMove={moveSection} />}
        {tab === 'content' && <ContentTab sections={portfolio.sections} onUpdateContent={updateSectionContent} />}
        {tab === 'design' && <DesignTab sections={portfolio.sections} theme={portfolio.theme} onVariantChange={setVariant} onThemeChange={setTheme} />}
        {tab === 'preview' && (
          <PreviewTab sections={portfolio.sections} theme={portfolio.theme} viewport={viewport} onViewportChange={setViewport} />
        )}
```

por:

```jsx
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
```

- [ ] **Step 5: Borrar los componentes viejos**

```bash
rm src/components/admin/SectionsTab.jsx
rm src/components/admin/ContentTab.jsx
```

- [ ] **Step 6: Verificar build**

Run: `npm run build`
Expected: sin errores. Si el build falla por un import roto, revisar que ningún otro archivo del proyecto importe `SectionsTab.jsx` o `ContentTab.jsx` (búsqueda rápida: `grep -rn "SectionsTab\|ContentTab" src/` debe no devolver nada fuera de lo ya cambiado en este step).

- [ ] **Step 7: Verificación manual**

Run: `npm run dev`, abrir un portfolio en `/editor/<id>`.
Expected:
- La barra de tabs tiene 3 botones: Secciones, Diseño, Vista previa (sin "Contenido").
- El tab "Secciones" muestra las 6 secciones como bloques, cada una con flechas de reorder, toggle, nombre y chevron.
- Las secciones activas arrancan expandidas mostrando su formulario de contenido; las inactivas arrancan colapsadas.
- Desactivar una sección expandida la colapsa automáticamente. Reactivarla no la expande sola.
- Reordenar con las flechas mueve el bloque completo (header + contenido si está expandido).
- Editar un campo dentro de una sección expandida dispara el autosave (indicador del header, Etapa 1) igual que antes.
- El subtítulo "Editando: {tab}" del header (Etapa 1) sigue funcionando con las 3 labels restantes.
- Confirmar en `/p/<slug>` (o en el tab Vista previa) que el orden y el estado activo/inactivo de las secciones se siguen reflejando correctamente en el portfolio público.

- [ ] **Step 8: Commit**

```bash
git add src/pages/EditorPage.jsx
git rm src/components/admin/SectionsTab.jsx src/components/admin/ContentTab.jsx
git commit -m "feat: merge editor Sections and Content tabs into one accordion panel"
```

---

## Self-Review Notes

- **Cobertura del spec:** Sección 1 (componente `SectionsContentTab`, estado de expansión, regla de auto-colapso) → Task 1. Sección 2 (`EditorPage.jsx`: tabs, `TAB_LABELS`) → Task 2. Sección 3 (CSS, reutilización de clases existentes) → Task 1, Step 2.
- **Placeholders:** ninguno — todo el código está completo.
- **Consistencia de tipos/nombres:** `SectionsContentTab({ sections, onToggle, onMove, onUpdateContent })` se define en Task 1 y se consume en Task 2, Step 4 con las mismas cuatro props, en el mismo orden de significado que ya usaban `SectionsTab`/`ContentTab` combinados (`toggleSection`, `moveSection`, `updateSectionContent` son los callbacks ya existentes en `EditorPage.jsx`, sin cambios de firma). `TAB_LABELS` pasa de 4 a 3 claves en Task 2 Step 2, consistente con los 3 botones de Step 3 y los 3 casos de render de Step 4.
