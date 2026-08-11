# Unificación de estilos del panel admin + dark mode

## Contexto

El panel de administración tiene tres vistas raíz: `LoginPage`, `DashboardPage` y `EditorPage`. El `EditorPage` usa la clase `.adm-shell`, que define variables CSS (`--a-bg`, `--a-panel`, `--a-border`, `--a-text`, `--a-muted`, `--a-accent`, `--a-accent-contrast`) consumidas por casi todas las clases `.adm-*`. `LoginPage` (`.auth-shell`, `.auth-card`, ...) y `DashboardPage` (`.dash-shell`, `.dash-header`, `.dash-card`, ...) en cambio usan valores hex hardcodeados (`#FAF8F4`, `#fff`, `#E7E2D8`, `#8A8272`...) duplicados en `src/styles/global.css`. Esto hace que cambiar el look del panel requiera editar en varios lugares y que no exista una forma limpia de soportar dark mode.

El portfolio público (`.pf-scope`, `PublicPortfolioPage`) ya tiene su propio sistema de variables (`--p-*`) y su propio dark mode vía `data-theme` en el elemento `.pf-scope` — es una configuración por-portfolio, elegida por el dueño del portfolio, no del panel admin. Este spec no lo toca.

## Alcance

- Unificar `LoginPage`, `DashboardPage` y `EditorPage` bajo el mismo sistema de variables `--a-*`.
- Añadir dark mode al panel admin (no al portfolio público), con paleta neutra/fría, con toggle persistente.
- No modificar `pf-scope`, `PublicPortfolioPage`, ni el theming propio de los portfolios publicados.

## Diseño

### 1. Variables compartidas

`.adm-shell` pasa a ser la clase de "scope" que define las variables `--a-*` y el fondo/color/font base. `LoginPage` y `DashboardPage` añaden `adm-shell` como clase adicional en su elemento raíz (junto a `auth-shell` / `dash-shell`, que quedan solo para layout: centrado, grid, etc.). Todas las reglas `.auth-*` y `.dash-*` en `global.css` se reescriben para usar `var(--a-bg)`, `var(--a-panel)`, `var(--a-border)`, `var(--a-text)`, `var(--a-muted)` en vez de hex literales.

### 2. Paleta dark

Nuevo bloque de overrides, activado por atributo en `<html>`:

```css
html[data-admin-theme="dark"] .adm-shell {
  --a-bg: #181818;
  --a-panel: #212121;
  --a-border: #333333;
  --a-text: #EDEDED;
  --a-muted: #9A9A9A;
  --a-accent: #D97757;       /* sin cambios */
  --a-accent-contrast: #FFFFFF;
}
```

Paleta neutra/fría (sin tinte cálido), a diferencia del dark mode existente en `pf-scope`. El acento terracota se mantiene igual en ambos modos. Se usa `html[data-admin-theme="dark"]` (no `data-theme`) para no colisionar con el atributo `data-theme` que ya usa `.pf-scope` para el theming del portfolio público — son conceptos independientes.

Elementos con estilos puntuales fuera de las variables (ej. sombras `rgba(0,0,0,...)`, el overlay del modal) se revisan para que sigan viéndose bien en dark; no requieren variable propia salvo que el contraste falle.

### 3. Estado del tema — `ThemeContext`

Nuevo `src/context/ThemeContext.jsx`, mismo patrón que `AuthContext.jsx`:

```js
export function ThemeProvider({ children }) { ... }
export function useTheme() { ... } // { theme: 'light' | 'dark', toggleTheme }
```

- Estado inicial: `localStorage.getItem('pb-admin-theme')` si existe; si no, `window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'`.
- Un `useLayoutEffect` sincroniza `document.documentElement.setAttribute('data-admin-theme', theme)` y persiste en `localStorage` en cada cambio.
- `toggleTheme` alterna entre `'light'` y `'dark'`.

`App.jsx` envuelve todo en `<ThemeProvider>` (fuera o dentro de `AuthProvider`, sin dependencia entre ambos).

### 4. Evitar flash al cargar

Pequeño script inline en `index.html`, antes de montar React, que lee `localStorage`/`prefers-color-scheme` y fija `data-admin-theme` en `<html>` de forma síncrona — mismo valor que calculará luego `ThemeProvider`, así no hay parpadeo visible entre el HTML estático y la hidratación de React.

### 5. Componente `ThemeToggle`

`src/components/admin/ThemeToggle.jsx`: botón icono (sol/luna de `lucide-react`, mismo estilo que `.adm-btn-ghost`) que llama a `toggleTheme()`. Se coloca:
- En `.adm-header` del Editor, junto a las demás acciones del header.
- En `.dash-header` del Dashboard, junto al botón de cerrar sesión.
- En `.auth-card` del Login (arriba, junto al título), ya que este no tiene header propio.

## Testing / verificación

- Verificación manual en navegador (Login, Dashboard, Editor) en claro y oscuro, revisando contraste de texto, bordes, inputs y botones.
- Confirmar que el toggle persiste tras recargar y tras navegar entre vistas (Login → Dashboard → Editor).
- Confirmar que el portfolio público (`/p/:slug`) no cambia de apariencia ni se ve afectado por el atributo `data-admin-theme`.
- No hay tests automatizados en el proyecto (no se agregan para este cambio, es puramente visual/CSS).
