# Fusión de Secciones + Contenido en un panel acordeón

## Contexto

Etapa 2 de 4 hacia el mockup de referencia de "Portfolio Studio" (Etapa 1, header con autosave persistente, ya implementada). Hoy `EditorPage.jsx` tiene 4 tabs excluyentes: `SectionsTab` (activar/reordenar secciones, sin ver su contenido) y `ContentTab` (editar campos de cada sección activa, sin poder reordenar ni activar desde ahí) están separados, obligando a cambiar de tab para relacionar orden y contenido. El mockup los muestra fusionados: cada sección es un bloque colapsable con su propio contenido adentro.

El set de secciones es fijo (Hero, Sobre mí, Proyectos, Habilidades, Experiencia, Contacto — definido en `src/data/sectionMeta.js` y en los datos iniciales del portfolio) — no se agregan ni quitan tipos de sección, solo se activan/desactivan y reordenan.

## Alcance

- Reemplaza `src/components/admin/SectionsTab.jsx` y `src/components/admin/ContentTab.jsx` por un único componente nuevo.
- Actualiza `EditorPage.jsx`: el tab "Secciones" pasa a mostrar el panel fusionado; se elimina el tab "Contenido".
- **No** toca `ContentForm.jsx` ni ningún form individual (`HeroForm`, `ProjectsForm`, etc.) — se siguen usando tal cual.
- **No** agrega drag-and-drop (sigue siendo reorder con flechas ↑↓, como hoy) ni animación de expandir/colapsar — es un cambio estructural, no de motion.
- **No** toca `DesignTab.jsx`, `PreviewTab.jsx`, ni el header del editor (ya cubierto en la Etapa 1).

## Diseño

### 1. Componente `SectionsContentTab`

Nuevo archivo `src/components/admin/SectionsContentTab.jsx`, reemplaza el uso combinado de `SectionsTab` + `ContentTab` en `EditorPage.jsx`. Props: `sections` (array), `onToggle(sectionId, enabled)`, `onMove(index, dir)`, `onUpdateContent(sectionId, content)` — mismas cuatro props que hoy reciben `SectionsTab` (`sections`, `onToggle`, `onMove`) y `ContentTab` (`sections`, `onUpdateContent`) combinadas, sin cambiar sus firmas.

Estado local (no persistido en Supabase, vive solo en el componente): un `Set` de IDs de sección expandidas, inicializado en el primer render a partir de las secciones con `enabled === true`.

Por cada sección en `sections` (en su orden actual), un bloque:
- **Header** (fila, reutiliza el layout de `.adm-section-row`): botones ↑/↓ para reordenar (llaman a `onMove`, deshabilitados en los extremos, igual que hoy), el `Toggle` de activar/desactivar (llama a `onToggle`), el label de la sección (`SECTION_META[type].label`), y un botón chevron a la derecha que alterna el ID en el Set de expandidas.
- **Body**: renderizado condicionalmente solo si el ID está en el Set de expandidas — el `ContentForm` de esa sección, sin cambios respecto a como lo usa `ContentTab` hoy.

Regla de interacción entre activar/desactivar y expandir/colapsar: al desactivar una sección (`onToggle(id, false)`), el componente quita ese ID del Set de expandidas en el mismo evento (auto-colapso). Al activarla de nuevo, el Set no se modifica automáticamente — el usuario decide si quiere expandirla. Expandir/colapsar manualmente vía el chevron no afecta el estado de activo/inactivo.

### 2. `EditorPage.jsx`

- El botón de tab "Contenido" y su `import ContentTab` se eliminan.
- El tab "Secciones" ahora renderiza `<SectionsContentTab sections={portfolio.sections} onToggle={toggleSection} onMove={moveSection} onUpdateContent={updateSectionContent} />` en el lugar donde antes estaban `SectionsTab` y `ContentTab` por separado.
- `TAB_LABELS` (usado en el subtítulo "Editando: {tab}" de la Etapa 1) pasa de 4 a 3 entradas: `{ sections: 'Secciones', design: 'Diseño', preview: 'Vista previa' }`.
- `adm-tabs` queda con 3 botones en vez de 4.

### 3. CSS

Reutiliza las clases ya existentes `.adm-section-row` (header del bloque) y `.adm-content-block`/`.adm-content-heading` (estilos de los campos dentro del body — aunque el heading redundante con el label del header se omite en el body, ya que el header del acordeón ya lo muestra). Se agregan solo:
- `.adm-section-block`: wrapper de cada sección (border, radius, reutilizando `--a-border`/`--a-panel`, mismo patrón visual que `.adm-section-row` de hoy pero conteniendo el body).
- `.adm-section-block-body`: padding para el `ContentForm` cuando está expandido.

Sin transición de altura animada (fuera de alcance) — el body aparece/desaparece con renderizado condicional simple, igual que el resto de los tabs del editor hoy.

## Testing / verificación

- Verificación manual: abrir un portfolio en el editor, confirmar que el tab "Secciones" muestra las 6 secciones con sus toggles, flechas de reorden y contenido inline.
- Activar/desactivar una sección: confirmar que desactivar colapsa el body automáticamente, y que el contenido del portfolio público (`/p/:slug`) sigue reflejando el estado de `enabled` correctamente (esto ya funciona hoy vía `PortfolioRenderer`, no debería romperse).
- Reordenar con las flechas: confirmar que el orden se refleja tanto en el header del acordeón como en la vista previa/publicación.
- Editar un campo de contenido dentro de una sección expandida: confirmar que dispara el autosave (Etapa 1) igual que antes.
- Confirmar que el tab "Contenido" ya no existe en la barra de tabs, y que el subtítulo del header (Etapa 1) sigue funcionando con las 3 labels restantes.
- No hay tests automatizados en el proyecto; verificación puramente manual, igual que specs previos.
