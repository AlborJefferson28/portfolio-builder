# Header del Editor: autosave persistente + breadcrumb con contexto

## Contexto

Comparando el mockup de referencia de "Portfolio Studio" contra [`EditorPage.jsx`](../../../src/pages/EditorPage.jsx) se identificaron varias brechas de pulido (ver conversación previa). Esta es la Etapa 1, la más chica: el header del editor hoy tiene un indicador de guardado efímero y un botón de volver sin label, mientras que el mockup muestra "Autosaved 1m ago" siempre visible y un breadcrumb claro con contexto ("Back to Dashboard" / "Editing Homepage").

Es la primera de 4 etapas independientes hacia ese mockup (fusión Secciones+Contenido, imagen en proyectos, y canvas en vivo quedan para specs futuros).

## Alcance

- Header de `EditorPage.jsx`: indicador de autosave, botón de volver, subtítulo de contexto.
- Nueva función utilitaria de formateo de tiempo relativo.
- **No** toca el contenido de los tabs (Secciones/Contenido/Diseño/Vista previa) ni la lógica de guardado en sí (`supabase.update`, debounce de 600ms) — solo cómo se comunica su estado.
- **No** toca `DashboardPage.jsx` ni ningún otro header de la app.

## Diseño

### 1. Indicador de autosave persistente

Estado nuevo en `EditorPage.jsx`: `lastSavedAt` (timestamp `Date` o `null`, inicialmente `null`). Se setea a `new Date()` cada vez que el `useEffect` de autosave existente completa un `update` exitoso (mismo punto donde hoy se hace `setSaveState('saved')`).

Nueva función pura `src/utils/formatRelativeTime.js`:

```js
export function formatRelativeTime(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'justo ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}
```

`EditorPage.jsx` mantiene un segundo estado, `relativeSavedLabel` (string), recalculado por un `setInterval` de 20s mientras `lastSavedAt` no sea `null` (se limpia el interval al desmontar o cuando `lastSavedAt` cambia, para evitar drift). El indicador (`adm-save-indicator`) renderiza:
- `saveState === 'saving'` → "Guardando…"
- si no, y `lastSavedAt` existe → `Guardado ${relativeSavedLabel}`
- si no, nada (estado inicial, antes del primer guardado — no hay nada que reportar todavía)

No se agrega ninguna dependencia nueva (sin librerías de fechas).

### 2. Breadcrumb con label

El botón de volver (hoy solo ícono `ArrowLeft`) pasa a incluir el texto "Volver al panel" junto al ícono, dentro del mismo `<Link className="adm-btn-ghost">`.

### 3. Subtítulo de contexto dinámico

Debajo de `.adm-brand` (que se mantiene sin cambios: "$ portfolio-builder" + título del portfolio), se agrega un `<span className="adm-header-context">` con el texto "Editando: {label del tab activo}", usando las mismas etiquetas ya visibles en los botones de tab (Secciones/Contenido/Diseño/Vista previa) para no duplicar strings — se deriva de un mapa `{ sections: 'Secciones', content: 'Contenido', design: 'Diseño', preview: 'Vista previa' }` ya implícito en el JSX de `adm-tabs`.

CSS nuevo en `global.css`: `.adm-header-context { font-size: 11.5px; color: var(--a-muted); font-family: var(--font-mono); }`, reutilizando el token `--a-muted` existente (ya auditado para contraste AA en ambos temas).

## Testing / verificación

- Verificación manual: abrir el editor, confirmar que "Guardando…" aparece al editar, y que pasa a "Guardado justo ahora" y luego "Guardado hace 1m", "hace 2m", etc. sin recargar la página.
- Confirmar que el subtítulo cambia de texto al cambiar de tab.
- Confirmar que el botón de volver sigue navegando a `/dashboard` con el label visible.
- No hay tests automatizados en el proyecto; verificación puramente manual, igual que specs previos.
