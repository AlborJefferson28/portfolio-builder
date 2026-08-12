# Pulido del sistema visual: Dashboard y Editor a la altura del Login

## Contexto

El login (`LoginPage`, ver `2026-08-11-auth-split-screen-redesign-design.md` y `2026-08-12-auth-visual-multiscene-design.md`) tiene un nivel de cuidado — mock animado de 5 escenas, motion consistente, jerarquía tipográfica clara — que `DashboardPage` y `EditorPage` todavía no alcanzan. Comparado contra mockups de referencia de un "Creator Hub" / "Portfolio Studio" más maduro, se identificaron seis brechas puntuales:

1. No hay escala de sombra ni de motion compartida — cada componente define sus propios valores ad-hoc o no tiene transición.
2. El Dashboard no comunica ningún dato agregado (vistas, cantidad de portfolios) ni identidad de usuario — va directo a la lista.
3. `.adm-tabs` del Editor cambia de estado sin transición.
4. El dark mode del panel admin (`2026-08-11-admin-theme-unification-design.md`) nunca se auditó contra el nivel de detalle del dark del login.
5. El único modal (`PublishModal`) aparece sin transición y sin auto-focus.
6. No existe un layout de navegación lateral — el Dashboard usa el mismo header horizontal que el Editor.

Este spec cubre las seis brechas como un único sistema de trabajo, en fases incrementales que se pueden implementar y verificar por separado.

## Alcance

- Extiende el sistema de variables `--a-*` (definido en `2026-08-11-admin-theme-unification-design.md`) con tokens de sombra y motion.
- Toca `DashboardPage`, `EditorPage`, `PublishModal`, y `global.css`.
- Agrega dos componentes nuevos: `AppSidebar` y `StatCard`.
- Agrega tracking mínimo de vistas públicas (columna + función RPC en Supabase) para alimentar un stat card real.
- **No** toca `pf-scope` (theming del portfolio público, es independiente) ni el login (ya está en el nivel objetivo).
- **No** incluye: subida de imágenes / Storage real (se descarta el card "Storage Used" por no haber upload de archivos en el proyecto — hoy `photoUrl` es un input de texto libre), drag-and-drop de secciones/proyectos, ni las páginas Analytics/Templates/Settings (quedan como ítems deshabilitados de navegación, sin funcionalidad).

## Diseño

### Fase 0 — Fundación de tokens

Se agregan variables nuevas a `.adm-shell` (`global.css`, junto a las `--a-*` existentes) y su espejo en `html[data-admin-theme="dark"] .adm-shell`:

```css
.adm-shell {
  /* ...variables existentes... */
  --a-panel-2: #F1ECE3;      /* superficie elevada, distinta de --a-panel y --a-bg */
  --a-shadow-sm: 0 1px 3px rgba(38,32,25,0.08);
  --a-shadow-md: 0 8px 20px rgba(38,32,25,0.08);
  --a-shadow-lg: 0 20px 50px rgba(38,32,25,0.16);
  --a-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --a-duration-fast: 150ms;
  --a-duration-base: 220ms;
}
html[data-admin-theme="dark"] .adm-shell {
  --a-panel-2: #2A2A2A;
  --a-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --a-shadow-md: 0 8px 20px rgba(0,0,0,0.35);
  --a-shadow-lg: 0 20px 50px rgba(0,0,0,0.5);
}
```

Los valores de sombra y `--a-panel-2` en dark se definen en esta fase junto con los `light`, no se posponen a la Fase 3 — evita un estado intermedio inconsistente.

Se reemplazan los valores hardcodeados existentes por los tokens nuevos:
- `.adm-modal` — `box-shadow: 0 20px 60px rgba(0,0,0,0.2)` → `var(--a-shadow-lg)`.
- `.adm-preview-frame` — `box-shadow: 0 10px 30px rgba(0,0,0,0.06)` → `var(--a-shadow-md)`.
- `.auth-portfolio-mock` (login) — se deja como está; ya tiene su propia paleta `--av-*` independiente y no forma parte de este scope.

Sin cambio visual perceptible más allá de una consistencia sutil; es la base para las fases siguientes.

### Fase 1 — Motion unificado

Reglas de transición nuevas, usando los tokens de la Fase 0:

- `.dash-card` (o su reemplazo en Fase 5): `transition: transform var(--a-duration-base) var(--a-ease), box-shadow var(--a-duration-base) var(--a-ease);` + hover con `transform: translateY(-2px); box-shadow: var(--a-shadow-md);` — mismo patrón que ya usa `.pf-project-card:hover`.
- `.adm-modal-overlay`: fade de opacidad; `.adm-modal`: fade + `scale(0.97) → scale(1)` al montar. Se implementa con una clase `is-entering` aplicada un frame después del montaje (o `@starting-style` si el soporte de navegador del proyecto lo permite; si no, un `useState` + `useEffect` con `requestAnimationFrame` en `PublishModal`).
- `.adm-tabs button`: `transition: background var(--a-duration-fast) var(--a-ease), color var(--a-duration-fast) var(--a-ease);`

Todo dentro del bloque `@media (prefers-reduced-motion: reduce)` ya existente al final de `global.css`, que desactiva animaciones y transiciones globalmente — no se necesita lógica adicional para respetarlo.

### Fase 2 — Rediseño de `.adm-tabs`

Los tabs del Editor (Secciones/Contenido/Diseño/Vista previa) permanecen horizontales en el header — no se convierten en sidebar; el layout de referencia tampoco lo hace en el editor, solo en el Dashboard.

Cambio: el fondo de pill activo (`background: #F4E3D8`) pasa a animarse con un elemento indicador que se desliza entre botones en vez de aparecer/desaparecer de golpe. Implementación más simple sin medir posiciones en JS: cada botón mantiene su propio fondo pero con la transición de la Fase 1 aplicada — es una animación de cross-fade, no un slide real de un indicador compartido (evita agregar refs/mediciones de layout por un beneficio marginal). Si en la verificación visual el cross-fade no convence, se evalúa un indicador con `layoutId`-style solo si el proyecto ya tuviera Framer Motion (no es el caso hoy, así que no se agrega la dependencia solo para esto).

### Fase 3 — Auditoría de dark mode admin

Con los tokens de Fase 0 ya definidos para ambos modos:

- Verificar contraste `--a-muted` (#9A9A9A) sobre `--a-panel` (#212121) y `--a-panel-2` (#2A2A2A) con una herramienta de contraste — objetivo AA (4.5:1 para texto normal, 3:1 para texto grande/iconos).
- Confirmar que `--a-shadow-*` en dark se ven (sombras con `rgba(0,0,0,...)` sobre fondo ya oscuro pueden ser invisibles; de ser así, usarían un borde sutil adicional `1px solid var(--a-border)` en vez de depender solo de sombra — patrón que `.adm-modal` ya usa).
- Extender los overrides dark a `AppSidebar` y `StatCard` (Fase 5) en el mismo bloque `html[data-admin-theme="dark"] .adm-shell`.

### Fase 4 — Auditoría de modales

Único modal existente: `PublishModal`.

- Aplica la transición de entrada de la Fase 1.
- Auto-focus: al abrir en vista `edit`, foco en el input de slug; al abrir en vista `success`, foco en el botón "Ver portfolio publicado". Se implementa con un `ref` + `useEffect([open, view])`.
- Cierre por click en overlay y por Escape ya están implementados — no se tocan.
- Este patrón (overlay + panel con fade/scale + auto-focus + Escape) queda documentado aquí como la referencia para cualquier modal que se agregue en el futuro; no se crea un componente `Modal` genérico porque solo hay un uso real hoy (evita abstraer prematuramente).

### Fase 5 — `AppSidebar` + `StatCard`

**`AppSidebar`** (`src/components/admin/AppSidebar.jsx`), nuevo, usado solo en `DashboardPage` (el Editor conserva su header horizontal actual, sin sidebar — igual que en el layout de referencia).

- Ítems: Dashboard (activo, ruta real `/dashboard`), Portfolios, Analytics, Templates, Settings.
- Solo "Dashboard" es funcional. Los otros cuatro se renderizan `disabled`, con estilo atenuado (`opacity: 0.5`, `cursor: default`) y un badge "Próximamente" — visibles para comunicar la dirección del producto sin prometer funcionalidad que no existe.
- Estructura: logo/marca arriba (reusa el patrón `.adm-brand` del header actual), lista de nav en el medio, nada abajo por ahora (no hay perfil de usuario con avatar/plan en el alcance — no hay datos de plan en el proyecto; se deja para un spec futuro si se agrega billing).
- Layout: `DashboardPage` pasa de `flex-direction: column` (header arriba, main abajo) a un grid de dos columnas (sidebar fijo ~220px + contenido). Breakpoint mobile: sidebar colapsa (se deja como mejora futura si hace falta — el proyecto no tiene aún ningún patrón de sidebar responsive que replicar; para este spec el sidebar se oculta bajo un ancho mínimo similar a como `.auth-visual-pane` ya se oculta en `@media (max-width: 899px)`).

**`StatCard`** (`src/components/admin/StatCard.jsx`), nuevo, genérico: recibe `label`, `value`, `hint` (opcional). Usa `--a-panel-2`, `--a-shadow-sm`, radio de borde consistente con `.dash-card`.

Dos instancias reales en `DashboardPage`:
- **Active Portfolios**: `portfolios.length` (ya está en memoria tras el fetch existente, sin query nueva).
- **Total Views**: suma de una columna `views` nueva.

Se descarta "Storage Used" (no hay upload de archivos en el proyecto).

**Tracking de vistas** — cambios en Supabase:

```sql
alter table portfolios add column views integer not null default 0;

create or replace function increment_portfolio_views(portfolio_id uuid)
returns void
language sql
security definer
as $$
  update portfolios set views = views + 1 where id = portfolio_id and published = true;
$$;
```

`security definer` es necesario porque el visitante público es anónimo y no tiene permiso de `update` sobre `portfolios` vía RLS; la función corre con los privilegios de quien la creó, acotada a incrementar `views` de portfolios publicados únicamente.

En `PublicPortfolioPage.jsx`, dentro del `useEffect` que carga el portfolio, tras un fetch exitoso y solo si `!isOwner`:

```js
const viewedKey = `pb-viewed-${data.id}`;
if (!sessionStorage.getItem(viewedKey)) {
  sessionStorage.setItem(viewedKey, '1');
  supabase.rpc('increment_portfolio_views', { portfolio_id: data.id });
}
```

El guard de `sessionStorage` evita inflar el contador en refreshes dentro de la misma pestaña/sesión; no pretende ser a prueba de manipulación (no es el objetivo — es un contador informativo para el dueño, no un sistema de analytics con integridad garantizada).

En `DashboardPage.jsx`, el `select` existente se extiende para traer `views` (`'id, title, slug, published, updated_at, views'`), y `Total Views` se calcula como `portfolios.reduce((sum, p) => sum + p.views, 0)`.

## Testing / verificación

- Verificación manual en navegador: Dashboard y Editor, en claro y oscuro, comparando contra el nivel de pulido del Login.
- Confirmar que las transiciones (Fases 1, 2, 4) se desactivan correctamente bajo `prefers-reduced-motion: reduce`.
- Confirmar contraste AA de los tokens nuevos en dark (Fase 3), con foco en `--a-muted` sobre `--a-panel-2`.
- Probar `PublishModal`: auto-focus correcto en ambas vistas (`edit`/`success`), cierre por Escape y por click en overlay siguen funcionando.
- Probar el flujo de vistas: visitar `/p/:slug` como no-dueño incrementa `views` una vez por sesión; visitar como dueño (`isOwner`) no incrementa; el Dashboard refleja la suma correcta tras recargar.
- Confirmar que el Editor no cambió de layout (sigue sin sidebar) y que el Dashboard con sidebar se ve razonable en mobile (sidebar oculto bajo el breakpoint, sin romper el grid de `dash-grid`/`StatCard`).
- No hay tests automatizados en el proyecto; verificación puramente manual, igual que los specs previos de esta serie.
