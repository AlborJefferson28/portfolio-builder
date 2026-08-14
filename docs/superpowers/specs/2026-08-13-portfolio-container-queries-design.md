# Contenido del portfolio responsive al contenedor (container queries) en vez de al viewport

## Contexto

En el editor, la pantalla simulada del preview (feature de aspect-ratio, commits `3489f5c`/`53f6a33`) ya tiene el tamaño correcto (16:9 en Escritorio, 9:19.5 en Móvil), pero el **contenido del portfolio dentro** no se adapta a ese tamaño — se ve igual que en una ventana de escritorio completa, aunque esté renderizado dentro de una pantalla simulada angosta de 296px. La causa: los estilos `.pf-*` (`src/styles/global.css`, usados tanto por el preview del editor como por el portfolio publicado real en `/p/:slug`) usan `vw` (viewport width) en 3 `clamp()` de tamaño de fuente, y un `@media (max-width: 640px)` — ambos miden el **viewport del navegador**, no el contenedor donde vive `.pf-scope`. Dentro de una pantalla simulada, el viewport real sigue siendo el de la ventana del editor (ej. 1280px), así que esas reglas nunca se activan aunque el contenedor visual sea angosto.

## Alcance

- Modifica solo `src/styles/global.css`, dentro del sistema de estilos `.pf-*` compartido (usado por `PortfolioRenderer` tanto en el preview del editor como en `/p/:slug`).
- `.pf-scope` (línea ~584) gana `container-type: inline-size;` — lo convierte en contenedor de tamaño para container queries, tanto en el editor (donde el contenedor es la pantalla simulada) como en la página publicada (donde el contenedor es casi todo el ancho de la ventana).
- Los 3 `clamp()` que usan `vw` cambian a `cqw`, mismo valor numérico:
  - `.pf-hero-name`: `clamp(36px, 7vw, 58px)` → `clamp(36px, 7cqw, 58px)`.
  - `.pf-hero-split .pf-hero-name`: `clamp(32px, 5.5vw, 50px)` → `clamp(32px, 5.5cqw, 50px)`.
  - El `clamp(22px, 4vw, 32px)` de la sección de contacto → `clamp(22px, 4cqw, 32px)`.
- El `@media (max-width: 640px)` existente (línea ~709) contiene 3 reglas: `.adm-main { padding... }` (no es `pf-`, no se toca, se queda en el `@media`), `.pf-project-row { grid-template-columns: 30px 1fr; }` y `.pf-hero-split .pf-hero-visual { max-width: 260px; margin: 0 auto; aspect-ratio: 1/1; }` (ambas `pf-`, se mueven a un `@container (max-width: 640px) { ... }` nuevo, mismo umbral numérico).
- No se toca ninguna otra regla `.pf-*` — el resto del sistema (grids `auto-fit`, `flex-wrap`) ya responde al ancho real del contenedor de forma nativa, sin necesitar container queries.
- No se toca `PreviewTab.jsx`, `PortfolioRenderer.jsx`, ni ningún componente — cambio puramente CSS.
- No se agregan fallbacks para navegadores sin soporte de container queries (soportado en Chrome/Firefox/Safari desde 2022-2023; se asume un navegador moderno, igual que el resto del proyecto).

## Diseño

`container-type: inline-size` en `.pf-scope` establece el contexto de container query en el ancho real donde se renderiza — sin importar si ese `.pf-scope` está dentro de `.adm-preview-frame` (296px en el bisel móvil, 840px en la ventana de escritorio simulada) o directamente en la página publicada (casi el ancho completo de la ventana). Las unidades `cqw` (1% del ancho del contenedor de query más cercano) y las reglas `@container` reemplazan exactamente el rol que cumplían `vw`/`@media`, con el mismo valor numérico — el comportamiento visual en la página publicada no debería cambiar (ahí el contenedor ≈ viewport), pero en el preview del editor el contenido ahora sí se reduce/reacomoda según el tamaño real de la pantalla simulada.

## Testing / verificación

- `npm run build` pasa sin errores.
- En `/editor/<id>`, modo Móvil: el nombre del hero (`.pf-hero-name`) se ve proporcionalmente más chico dentro de la pantalla simulada angosta, no con el tamaño que tendría en escritorio completo.
- `.pf-project-row` y `.pf-hero-split .pf-hero-visual` (si la sección Hero está en variante split) se reacomodan al ancho angosto del bisel móvil, igual que lo harían hoy en una ventana real de navegador angosta.
- En modo Escritorio (840px simulados), el contenido se ve como corresponde a un ancho ~840px (similar a como se vería hoy en una ventana de navegador real de ese ancho).
- En `/p/<slug>` (portfolio publicado real): sin cambios visuales respecto a hoy, en ningún tamaño de ventana — confirmar redimensionando la ventana del navegador real (no simulada) por encima y por debajo de 640px.
- No hay tests automatizados; verificación puramente manual.
