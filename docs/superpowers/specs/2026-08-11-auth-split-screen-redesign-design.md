# Rediseño de Login/Registro: split-screen estilo Claude

## Contexto

`LoginPage.jsx` (`src/pages/LoginPage.jsx`) es la única página de autenticación: maneja login y
registro con un toggle de `mode` (`signin` / `signup`). Hoy se renderiza como una tarjeta centrada
(`auth-card`) con borde y sombra sobre `adm-shell`, usando las variables de tema admin ya
existentes (`--a-bg`, `--a-panel`, `--a-border`, `--a-text`, `--a-muted`, `--a-accent`) y las
fuentes `Fraunces` (display) / `Inter` (body). El proyecto ya tiene modo claro/oscuro vía
`html[data-admin-theme="dark"]` y un `ThemeToggle` reusable.

Objetivo: elevar el nivel visual de esta pantalla al de `claude.ai/login` (split-screen,
formulario sin tarjeta con borde, panel visual lateral), sin depender de imágenes/video externos y
sin romper la lógica de autenticación existente.

## Alcance

- Solo cambios visuales/estructurales en `LoginPage.jsx` y CSS asociado (`src/styles/global.css`
  u hoja nueva).
- No se toca `AuthContext`, lógica de Supabase, ni rutas.
- No se crea una página de registro separada; se mantiene el toggle `signin`/`signup` en el mismo
  componente.

## Layout

Contenedor raíz `auth-split` con `display: grid; grid-template-columns: 1fr 1fr;` en viewports
`>= 900px`:

- **Columna izquierda (`auth-form-pane`)**: fondo = tema activo del usuario (`--a-bg` /
  equivalente oscuro vía `data-admin-theme`). El formulario ya no vive dentro de una tarjeta con
  borde/sombra (`auth-card` se elimina); se centra vertical y horizontalmente con
  `max-width: 380px` flotando directo sobre el fondo del panel.
- **Columna derecha (`auth-visual-pane`)**: fondo oscuro fijo e independiente del tema del
  usuario (paleta cálida oscura derivada del acento existente: base `#1F1611`/`#2A1D16`, acento
  `#D97757` / `#F0A480` para detalles), overflow hidden, contiene la animación CSS del portfolio y
  un bloque de texto (eyebrow + título) debajo.

En viewports `< 900px`: `auth-split` pasa a una sola columna (`grid-template-columns: 1fr`), la
columna derecha (`auth-visual-pane`) se oculta con `display: none`, y el formulario ocupa el ancho
completo centrado — comportamiento equivalente al actual.

`ThemeToggle` se reposiciona a la esquina superior de `auth-form-pane` (ya no `position: absolute`
sobre una tarjeta, sino sobre el panel completo).

## Panel visual (`auth-visual-pane`)

Contenido 100% CSS/SVG, sin imágenes ni video externos:

1. **Mockup animado** (`auth-portfolio-mock`): tarjeta rectangular centrada que simula un
   portfolio armándose en loop continuo (~6-8s, `ease-in-out`, `infinite`):
   - Avatar circular con iniciales aparece (`fade + scale`).
   - Dos barras (nombre, tagline) crecen de `width: 0` a su ancho final, en secuencia.
   - 3 tarjetas de "proyecto" (rectángulos con gradiente tipo shimmer) entran con
     `translateY` + `fade`, escalonadas (`animation-delay` incremental).
   - Chip "● Publicado" con el punto pulsando (`opacity`/`box-shadow` en verde o el acento).
   - Al final del ciclo, todo el mockup hace fade-out y vuelve a fade-in desde el paso 1 (loop).
   - Toda la animación respeta `prefers-reduced-motion: reduce`: si está activo, se muestra el
     estado final estático (sin `animation`).
2. **Texto fijo** debajo del mockup: eyebrow en `font-mono` (ej. `$ tu-portfolio`) + título en
   `font-display` (Fraunces), ej. "Creá y personalizá tu portfolio público en minutos". Texto en
   tono claro/crema sobre el fondo oscuro del panel.

No hay interactividad en este panel; es puramente decorativo.

## Formulario (`auth-form-pane`)

Mismo contenido y lógica de `LoginPage.jsx` actual (email, password, botón Google, submit,
mensajes de error, switch signin/signup), con estos cambios de presentación:

- Sin contenedor con borde/sombra (`auth-card` → se retira o se vacía de esos estilos).
- Título más prominente (`font-display`, tamaño mayor que el actual `24px`), texto dinámico según
  `mode`: "Bienvenido de vuelta" (signin) / "Creá tu cuenta" (signup).
- Subtítulo, botón Google, divisor "o con email", inputs (`adm-field`/`adm-input`), botón primario
  (`adm-btn-primary`) y switch de modo se mantienen con sus estilos actuales (ya alineados a la
  paleta cálida tipo Claude).

## CSS

Se añaden reglas nuevas en `src/styles/global.css` bajo un bloque `/* ---------- Auth split
screen ---------- */`:

- `.auth-split`, `.auth-form-pane`, `.auth-visual-pane` (grid + media query `900px`).
- `.auth-portfolio-mock` y sub-elementos (`@keyframes` para cada fase de la animación).
- `.auth-visual-eyebrow`, `.auth-visual-title`.
- Ajustes de `.auth-title`, `.auth-subtitle` para el nuevo tamaño/contexto (sin tarjeta).
- Se eliminan/reemplazan las reglas viejas de `.auth-card` que ya no aplican (borde, sombra,
  max-width de tarjeta) y se mantiene lo que sigue siendo válido (`.auth-form`, `.auth-divider`,
  `.auth-switch`, `.auth-btn-google`).
- Paleta oscura del panel visual se define con variables locales al bloque (no variables
  globales de tema), ya que es intencionalmente independiente del toggle claro/oscuro.

## Testing / verificación

- Verificación manual en navegador (Vite dev server): revisar layout en desktop (≥900px) y mobile
  (<900px, usando `resize_window`), en modo claro y oscuro (toggle existente), y probar el switch
  signin/signup y el submit (mock o real contra Supabase si hay sesión de prueba disponible).
- No aplica testing automatizado nuevo (no hay suite de tests en el proyecto para páginas React).
