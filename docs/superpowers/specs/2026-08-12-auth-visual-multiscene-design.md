# Rediseño del mock animado del login: 5 escenas narrativas del flujo real

## Contexto

El panel visual del login (`.auth-visual-pane` en `src/pages/LoginPage.jsx`, estilos en
`src/styles/global.css`) hoy contiene un único mock (`.auth-portfolio-mock`) que anima una sola
"escena": avatar → nombre/tagline → 3 bloques de proyecto → chip "Publicado", en loop de 7s. Fue
implementado en dos tareas previas (`docs/superpowers/plans/2026-08-12-auth-split-screen-redesign.md`,
commits `8a1864f`, `d8e6a2d`, `4d14e71`).

El usuario pidió que la animación refleje de forma más completa los procesos reales que ofrece la
app. El editor (`src/pages/EditorPage.jsx`) tiene 4 pestañas reales: **Secciones**
(`SectionsTab.jsx` — activar/reordenar secciones), **Contenido** (`ContentTab.jsx` — formularios
de texto), **Diseño** (`DesignTab.jsx` — paleta/variantes), **Vista previa** (`PreviewTab.jsx` —
preview mobile/desktop), más el flujo de **Publicar** (`PublishModal.jsx`).

## Alcance

- Reemplaza el contenido interno de `.auth-portfolio-mock` por 5 "escenas" en loop que narran ese
  flujo real, una por cada paso del editor + publicación.
- No cambia el layout split-screen, el panel de formulario, ni el texto fijo del panel visual
  (`auth-visual-eyebrow`, `auth-visual-title`) — eso queda tal cual quedó en el plan anterior.
- Sigue siendo 100% CSS/`@keyframes`, sin JS, sin imágenes/video, sin librería de iconos (se
  mantiene el patrón de `<div>`s con CSS ya usado, coherente con que `.auth-portfolio-mock` es
  `aria-hidden="true"` — puramente decorativo).
- Se mantiene el soporte de `prefers-reduced-motion: reduce` (estado final estático).

## Estructura de escenas

Ciclo total: **18s**, 5 escenas de igual duración (20% = 3.6s cada una). Las escenas son capas
superpuestas dentro del mismo contenedor (`position: relative` en `.auth-portfolio-mock`,
`position: absolute; inset: 14px;` — respetando el padding actual del mock — en cada `.apm-scene`),
cada una con su propia `@keyframes` de opacidad sincronizada al mismo reloj de 18s, de forma que
solo una escena es visible (`opacity: 1`) a la vez. Este es el mismo mecanismo que ya usan
`.apm-project-1/2/3` (offsets distintos, misma duración compartida) — se extiende el patrón, no se
introduce uno nuevo.

Ventanas de visibilidad (dentro del ciclo de 18s / 100%):
- Escena 1 (Secciones): visible ~0%–20% (con fade-in ~0–2% y fade-out ~18–20%)
- Escena 2 (Contenido): visible ~20%–40%
- Escena 3 (Diseño): visible ~40%–60%
- Escena 4 (Vista previa): visible ~60%–80%
- Escena 5 (Publicar): visible ~80%–100%

### Escena 1 — Secciones (`.apm-scene-sections`)

4 filas (`.apm-srow`), cada una: un pequeño switch (`.apm-sswitch`, reutiliza visualmente el patrón
de `.adm-toggle` pero en miniatura, no la clase en sí) + una barra corta de "nombre de sección"
(reutiliza `.apm-line`). Las filas representan Hero, Proyectos, Skills, Contacto. Timeline interno
(relativo a la ventana de la escena):
- Al entrar: las 4 filas ya están presentes (opacity fija, no re-animan individualmente) con los
  primeros 2 switches ya en "on" (color de acento) y los últimos 2 en "off" (gris).
- A mitad de la ventana de la escena, el switch de la fila 3 pasa de "off" a "on" (transición de
  `background-color`, sin JS, vía keyframe de la propia escena — no requiere una animación anidada
  separada, un solo `@keyframes` por elemento con offsets dentro del rango global del ciclo).
- El switch de la fila 4 pasa a "on" cerca del final de la ventana de la escena.

### Escena 2 — Contenido (`.apm-scene-content`)

2 pares label+input mock (`.apm-crow`): una barra corta "label" (`.apm-line`, chica, color muted) +
una barra más larga "input" (`.apm-cinput`) que crece de `scaleX(0)` a `scaleX(1)` con
`transform-origin: left` (mismo patrón que ya usamos para `.apm-line-name`/`.apm-line-tagline`,
evita animar `width` — lección ya aplicada en el fix anterior), simulando texto siendo tipeado. Los
dos inputs se llenan en secuencia (primero uno, después el otro) dentro de la ventana de la escena.

### Escena 3 — Diseño (`.apm-scene-design`)

3 círculos de color (`.apm-swatch`, ~16px, colores fijos distintos: acento cálido, un verde suave,
un azul suave — puramente decorativos, no ligados a `--av-accent` para que se lea como "opciones a
elegir") en fila. Uno de los tres tiene un anillo de selección (`.apm-swatch.is-selected`, `box-shadow`
de anillo) que rota de swatch 1 → 2 → 3 a lo largo de la ventana de la escena (vía tres
sub-`@keyframes`, uno por swatch, cada uno mostrando su anillo solo en su tercio de la ventana).

### Escena 4 — Vista previa (`.apm-scene-preview`)

Un marco rectangular pequeño (`.apm-device`, ~90px de ancho, `border-radius` grande simulando un
outline de teléfono) centrado, con dentro dos barras finas apiladas (`.apm-device-hero`,
`.apm-device-card`) que aparecen con fade-in escalonado, simulando una mini vista previa del
portfolio renderizándose adentro del marco.

### Escena 5 — Publicar (`.apm-scene-publish`)

Reutiliza el chip existente `.apm-chip` + `.apm-dot` (con su `@keyframes apm-dot-pulse` actual, sin
cambios) centrado en la escena, sin el avatar/líneas/proyectos de la versión anterior (esos
elementos y sus animaciones — `.apm-avatar`, `.apm-line-name`, `.apm-line-tagline`, `.apm-projects`,
`.apm-project-1/2/3` y sus `@keyframes` correspondientes — se eliminan por completo, reemplazados
por las 5 escenas nuevas).

## Indicador de escena

Debajo de `.auth-portfolio-mock` (dentro de `.auth-visual-pane`, entre el mock y el bloque de texto
eyebrow/título), 5 puntitos (`.apm-dots` → 5×`.apm-dot-indicator`, ~5px cada uno, `border-radius:
50%`, color muted por defecto). Cada puntito tiene su propio `@keyframes` sincronizado al mismo
ciclo de 18s que cambia su color/opacidad a "activo" (acento cálido, opacity 1) durante la ventana
de su escena correspondiente y "inactivo" (muted, opacity 0.4) el resto del tiempo. No hay
interactividad (no son botones, son parte del elemento `aria-hidden`).

## Reduced motion

El bloque `@media (prefers-reduced-motion: reduce)` existente se reescribe para las nuevas clases:
todas las escenas quedan con `animation: none; opacity: 1;` pero solo la Escena 5 (Publicar) queda
visualmente "activa" en el estado estático (mismo criterio que la versión anterior: mostrar el
estado final/resultado completo, no un frame intermedio arbitrario) — el resto de las escenas
quedan con `opacity: 0` fijo (sin animación) para no superponer contenido ilegible. El puntito 5
queda "activo" y los demás "inactivos" en ese mismo estado estático.

## Fuera de alcance

- No se cambia `LoginPage.jsx` fuera de lo estrictamente necesario para el nuevo markup del mock
  (el resto del componente — formulario, layout split, texto del panel — no se toca).
- No se agregan iconos de librería (`lucide-react`) al mock decorativo; se mantiene el vocabulario
  visual de `<div>`s ya establecido.
- No se ajusta la duración del ciclo por breakpoint ni se agrega control de pausa/play.
