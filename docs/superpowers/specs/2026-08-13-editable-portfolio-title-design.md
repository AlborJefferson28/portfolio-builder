# Nombre del portfolio editable in-place en el header del editor

## Contexto

El header del editor (`EditorPage.jsx`) muestra `portfolio.title` como texto estático (`<div className="adm-brand">`). El pedido: que sea editable ahí mismo, con click para entrar en modo edición — sin modal ni pantalla aparte.

`portfolio.title` hoy **no** forma parte del autosave existente (el `useEffect` de autosave solo observa y persiste `sections` y `theme`) — para que la edición del nombre se guarde, hay que sumarlo a ese mismo mecanismo.

## Alcance

- Modifica solo `src/pages/EditorPage.jsx`, y agrega estilos nuevos en `src/styles/global.css`.
- El texto del nombre (dentro de `.adm-brand`, después del `$`) se vuelve clickeable. Al hacer click, se reemplaza por un `<input>` con el valor actual, foco automático y texto seleccionado.
- **Confirmar cambio:** `Enter` o perder el foco (`onBlur`) — guarda el valor en el estado local (`setPortfolio`) y sale del modo edición. Si el valor quedó vacío (o solo espacios) tras recortar espacios, se descarta el cambio y se mantiene el título anterior — nunca se guarda un título vacío.
- **Cancelar cambio:** `Escape` — sale del modo edición sin aplicar el valor del input, el título queda como estaba antes de empezar a editar.
- El autosave existente (`useEffect` con debounce de 600ms que ya persiste `sections`/`theme` a Supabase) se extiende para incluir `title` — mismo mecanismo, mismo indicador "Guardando…/Guardado hace Xm" del header, sin agregar un segundo sistema de guardado.
- No se agrega validación de longitud máxima ni otros permisos — el título puede ser cualquier texto no vacío.
- No se toca `$`, el signo `adm-brand-mark`, que sigue siendo siempre visible (fuera del área editable).
- No se toca ningún otro campo del header (botón volver, tema, indicador de guardado, publicar).

## Diseño

### Estado nuevo en `EditorPage.jsx`

- `editingTitle` (bool, `useState(false)`).
- `titleDraft` (string, `useState('')`) — valor del input mientras se edita.
- `titleInputRef` (`useRef(null)`) — para foco + selección automática al entrar en modo edición.

### Handlers

- `startEditingTitle()`: `setTitleDraft(portfolio.title)`, `setEditingTitle(true)`.
- `commitTitle()`: recorta espacios del draft; si no está vacío y es distinto al título actual, `setPortfolio(p => ({ ...p, title: trimmed }))`; en cualquier caso, `setEditingTitle(false)`.
- `cancelTitle()`: `setEditingTitle(false)` sin tocar `portfolio.title`.
- `useEffect` que, cuando `editingTitle` pasa a `true`, hace foco + `select()` sobre el input (vía `titleInputRef`).

### JSX

Dentro de `.adm-brand`, después de `<span className="adm-brand-mark">$</span>`:
- Si `editingTitle` es `false`: `<button type="button" className="adm-brand-btn" onClick={startEditingTitle}>{portfolio.title}</button>`.
- Si `editingTitle` es `true`: `<input ref={titleInputRef} className="adm-brand-input" value={titleDraft} onChange={...} onBlur={commitTitle} onKeyDown={...Enter→commitTitle, Escape→cancelTitle} />`.

### Autosave

El `useEffect` de autosave (dependencias `[portfolio.sections, portfolio.theme]`, payload `{ sections, theme, updated_at }`) se extiende a `[portfolio.sections, portfolio.theme, portfolio.title]` y el payload a `{ sections, theme, title, updated_at }` — en las dos llamadas a `supabase.update(...)` que ya existen (el debounce normal y el guardado best-effort al desmontar/navegar). Sin cambios en el resto de la lógica de guardado (debounce de 600ms, indicador de estado, etc.).

### CSS (`src/styles/global.css`)

Junto a `.adm-brand`/`.adm-brand-mark` existentes:
- `.adm-brand-btn`: sin fondo/borde, hereda tipografía de `.adm-brand` (mono, 13px, `--a-muted`), cursor pointer, subrayado sutil al hover (`text-decoration-color: var(--a-border)`) para insinuar que es editable sin gritarlo.
- `.adm-brand-input`: misma tipografía, fondo `var(--a-bg)`, borde `1px solid var(--a-accent)` (para que se note claramente que está en edición), radio pequeño, padding chico, `min-width` razonable para no saltar de tamaño feo con nombres cortos.

## Testing / verificación

- `npm run build` pasa sin errores.
- En `/editor/<id>`, click sobre el nombre del portfolio en el header: se convierte en un input con el texto actual seleccionado y foco automático.
- Escribir un nombre nuevo y presionar Enter: el header muestra el nuevo nombre, el indicador de guardado pasa a "Guardando…" y luego "Guardado hace unos segundos" (mismo mecanismo que ya dispara `SectionsContentTab`/`DesignTab`).
- Recargar la página después de guardar: el nuevo nombre persiste (confirma que se guardó en Supabase, no solo en el estado local).
- Editar, borrar todo el texto, presionar Enter: el título vuelve a su valor anterior (no se guarda vacío).
- Editar, presionar Escape: el título vuelve a su valor anterior sin disparar guardado.
- Click afuera del input mientras se edita (blur): se comporta igual que Enter, confirma el cambio.
- No hay tests automatizados; verificación puramente manual.
