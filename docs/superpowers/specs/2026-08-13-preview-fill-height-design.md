# Pantalla simulada del preview: alto fijo a la columna, scroll interno

## Contexto

Ajuste rápido sobre la feature de chrome de dispositivo (`docs/superpowers/specs/2026-08-13-preview-device-chrome-design.md`). Hoy, en el layout de estudio (≥900px), `.adm-studio-preview .adm-preview-frame` tiene `max-height: none; overflow-y: visible` — la pantalla simulada (ventana de navegador o bisel móvil) crece con el contenido del portfolio, y es la columna `.adm-studio-preview` la que scrollea (`overflow-y: auto`) cuando el contenido no entra.

Esto se ve poco realista: una pantalla de escritorio o de teléfono real tiene un tamaño fijo, no crece con el contenido. El pedido es que la pantalla simulada ocupe el alto disponible de la columna (sin pasar del alto de la ventana del usuario, sin que la página scrollee) y que el scroll del contenido del portfolio ocurra **dentro** de la pantalla simulada, como pasaba antes de la feature del chrome (`.adm-preview-frame` original tenía `max-height: 640px; overflow-y: auto`, pero con un límite fijo arbitrario en vez de ajustarse al espacio real disponible).

## Alcance

- Modifica solo `src/styles/global.css`, dentro de las reglas ya existentes de `.adm-studio-preview` y su media query — no toca `PreviewTab.jsx` ni ningún otro componente.
- **≥900px** (layout de 2 columnas fijo, ya establecido): la pantalla simulada (`.adm-device-frame`, con su `.adm-preview-frame` interno) se estira para llenar el alto disponible de `.adm-studio-preview` — descontando el espacio del toolbar Escritorio/Móvil. `.adm-studio-preview` deja de scrollear como columna completa (`overflow: hidden`); el scroll pasa a `.adm-preview-frame` internamente (`overflow-y: auto`), igual que en una pantalla real cuyo contenido no entra.
- **<900px** (layout apilado, ya establecido en la etapa anterior): sin cambios — la página sigue scrolleando normalmente y la pantalla simulada de todos modos está oculta en este rango (el chrome/bisel ya se ocultan bajo 900px desde la feature anterior), así que este ajuste no tiene efecto visible ahí más allá de mantener el comportamiento actual intacto.
- El bisel móvil (`.adm-device-frame.is-mobile`), al estirarse a todo el alto disponible con su ancho ya limitado a 380px, naturalmente adopta una proporción alta y angosta parecida a un teléfono real — no requiere ningún cálculo de aspect-ratio adicional.
- No se agregan tokens CSS nuevos ni se modifican valores fuera de las reglas de `.adm-studio-preview`.

## Diseño

`.adm-studio-preview` pasa a ser un contenedor flex en columna que llena el alto de su celda en `.adm-studio-body` (ya `flex:1; min-height:0` desde la etapa 3), sin scroll propio. Dentro, `.adm-preview-wrap` (el toolbar + la pantalla simulada) se estira a `flex: 1; min-height: 0` para ocupar ese alto, y a su vez `.adm-device-frame` y `.adm-preview-frame` heredan `flex: 1; min-height: 0` para que sea el `.adm-preview-frame` — la pantalla simulada en sí — quien scrollee su contenido cuando no entra, en vez de la columna completa.

Bajo 900px, se neutraliza este comportamiento (vuelve a `display: block` / `overflow-y: visible` / sin `flex:1` en los hijos), preservando el flujo de documento normal ya establecido para el layout apilado.

## Testing / verificación

- `npm run build` pasa sin errores.
- En `/editor/<id>`, ≥900px: la pantalla simulada (ventana de navegador o bisel móvil) ocupa todo el alto disponible de la columna derecha, sin sobrepasar el borde inferior de la ventana del navegador del usuario ni generar scroll en la página.
- Si el contenido del portfolio no entra en ese alto, aparece una barra de scroll dentro de la pantalla simulada (no en la columna completa).
- Cambiar entre Escritorio/Móvil: ambas pantallas simuladas se estiran igual al alto disponible.
- Redimensionar bajo 900px: comportamiento idéntico al actual (sin cambios), página scrollea normalmente.
- No hay tests automatizados; verificación puramente manual.
