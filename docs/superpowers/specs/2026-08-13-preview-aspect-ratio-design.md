# Pantalla simulada del preview: tamaño fijo por aspect-ratio en vez de llenar la columna

## Contexto

Corrige el enfoque de la feature anterior (`docs/superpowers/specs/2026-08-13-preview-fill-height-design.md`, commits `37b7707`/`8932503`): ahí la pantalla simulada (`.adm-device-frame`) se estiraba con `flex: 1; min-height: 0` para llenar exactamente el alto disponible de la columna de preview. El resultado se sentía "de goma" — sin proporción fija, distinto en cada tamaño de ventana.

El pedido ahora: la pantalla simulada mantiene una **proporción fija** (aspect-ratio), como una pantalla real — Escritorio 16:9, Móvil 9:19.5 — y se ajusta al espacio disponible de la columna (por el eje que limite primero, ancho o alto) sin excederlo ni provocar scroll en la columna. El scroll del contenido del portfolio que no entre sigue ocurriendo **dentro** de la pantalla simulada (`.adm-preview-frame`, sin cambios en ese comportamiento).

## Alcance

- Modifica solo `src/styles/global.css`, dentro de las reglas de `.adm-device-frame` (base, `.is-desktop`, `.is-mobile`) y las reglas scoped `.adm-studio-preview .adm-device-frame`/`.adm-studio-preview .adm-preview-frame` agregadas en la feature anterior.
- No toca `PreviewTab.jsx` ni otros componentes.
- `.adm-device-frame.is-desktop`: `aspect-ratio: 16 / 9`.
- `.adm-device-frame.is-mobile`: `aspect-ratio: 9 / 19.5` (además de mantener el bisel — `border`, `padding-top`, `background` — ya existente de la feature del chrome).
- Ambas variantes se dimensionan por **alto disponible primero** (`height: 100%` respecto de `.adm-preview-wrap`, que ya tiene `flex: 1; min-height: 0` desde la feature anterior) y el ancho se deriva de la proporción (`width: auto`), acotado por un `max-width` (900px desktop / 380px móvil, igual que antes) para no volverse desproporcionadamente ancha en ventanas muy bajas y anchas. Si el ancho derivado de la altura excede el espacio horizontal disponible de la columna, se acota también a `100%` del contenedor — en ese caso la proporción exacta puede ceder levemente para evitar overflow horizontal (compromiso aceptado, no hay contenedor de queries CSS en este proyecto para un "contain-fit" perfecto en ambos ejes).
- `.adm-studio-preview .adm-preview-frame` sigue con `overflow-y: auto` (scroll interno del contenido, sin cambios) pero ya no necesita `flex: 1; min-height: 0` propio — hereda el tamaño de `.adm-device-frame` vía `display: flex; flex-direction: column` + stretch por defecto (ya presente en `.adm-device-frame`).
- `.adm-studio-preview .adm-device-frame { flex: 1; min-height: 0; }` (agregado en la feature anterior) se reemplaza — ya no debe estirarse a llenar todo el alto vía flex-grow, ahora su tamaño lo determina el aspect-ratio + `height: 100%`.
- Bajo 900px (chrome oculto, layout apilado): sin cambios de comportamiento respecto a hoy — se neutraliza también el aspect-ratio/height nuevos, igual que ya se neutralizaba el `flex:1` anterior, para que el flujo de documento normal (crecer con el contenido, scroll de página) siga intacto.

## Diseño

`.adm-preview-wrap` (ya `flex: 1; min-height: 0; width: 100%` dentro de `.adm-studio-preview`) sigue siendo quien tiene el alto disponible real de la columna. `.adm-device-frame` dentro de él pasa de "estirarse a llenar ese alto" a "ocupar el 100% de ese alto y calcular su ancho a partir de la proporción fija", quedando centrado horizontalmente por el `align-items: center` ya existente en `.adm-preview-wrap`. El resultado visual: la pantalla simulada tiene siempre a la misma forma (rectángulo ancho en Escritorio, rectángulo alto y angosto en Móvil), y su tamaño absoluto varía según el alto disponible de la ventana del usuario — más chica en ventanas bajas, más grande en ventanas altas — sin nunca desbordar ni generar scroll fuera de sí misma.

## Testing / verificación

- `npm run build` pasa sin errores.
- En `/editor/<id>`, ≥900px, modo Escritorio: la pantalla simulada tiene proporción visiblemente 16:9 (ancha, tipo monitor), centrada en la columna, sin tocar los bordes de la columna (gracias al padding ya existente) ni desbordar verticalmente la ventana.
- Modo Móvil: la pantalla simulada tiene proporción alta y angosta (9:19.5), centrada, sin desbordar.
- Redimensionar la ventana del navegador (más baja/más alta): la pantalla simulada cambia de tamaño manteniendo su proporción, nunca genera scroll en la columna — solo dentro de sí misma si el contenido del portfolio no entra.
- Redimensionar bajo 900px: comportamiento idéntico al actual (sin aspect-ratio, sin cambios visuales respecto a antes de esta feature).
- No hay tests automatizados; verificación puramente manual.
