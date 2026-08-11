# Migración a Vite + React + Supabase (deployable en Vercel)

## Contexto

`portfolio-builder.jsx` es un prototipo funcional de un solo archivo (56KB), construido para el entorno de "artifacts" de Claude. Permite armar un portfolio personal por secciones (Hero, Sobre mí, Proyectos, Habilidades, Experiencia, Contacto), cada una con variantes visuales, editarlo en un panel admin, y "publicarlo" bajo una ruta hash (`#/p/<slug>`). La persistencia actual depende de `window.storage`, una API exclusiva de ese entorno (borrador en storage privado, portfolio publicado en storage compartido).

El objetivo es migrar esto a una app Vite + React estándar, deployable en Vercel, con persistencia real vía Supabase y soporte multi-usuario.

## Decisiones

- **Persistencia:** Supabase (Postgres + Auth), proyecto nuevo (no existe uno para este propósito entre los proyectos actuales: `vault-accounts`, `ready-mvp`, `Budget-app`).
- **Alcance:** multi-usuario con autenticación. Cada usuario puede tener **múltiples portfolios**.
- **Auth:** email/password **y** Google OAuth, ambos habilitados desde el inicio.
- **Foto de perfil (Hero):** se mantiene como campo de texto (URL externa), sin subida de archivos ni Supabase Storage — fuera de alcance para esta migración.
- **Rutas:** `react-router-dom` con rutas reales (no hash routing), con SPA fallback vía `vercel.json`.

## Arquitectura

### Stack

- Vite + React 18
- `react-router-dom` (BrowserRouter)
- `@supabase/supabase-js`
- `lucide-react` (iconos, ya usado en el prototipo)
- `recharts` (gráficos de habilidades, ya usado en el prototipo)
- CSS plano (el mismo sistema de variables/clases del prototipo, movido a un archivo global). No se introduce Tailwind ni ninguna librería de UI nueva.

### Backend (Supabase)

Proyecto nuevo, ej. `portfolio-builder`.

**Auth:** proveedores email/password y Google OAuth habilitados en el dashboard de Supabase.

**Tabla `portfolios`:**

| columna | tipo | notas |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | FK a `auth.users`, not null |
| `title` | `text` | nombre interno visible solo en el dashboard (ej. "Mi portfolio dev") |
| `slug` | `text` | unique, nullable hasta que se publique por primera vez |
| `theme` | `text` | `'light' \| 'dark'` |
| `sections` | `jsonb` | array de secciones (mismo shape que `getInitialData().sections` del prototipo) |
| `published` | `boolean` | default `false` |
| `published_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()`, actualizado en cada guardado |

**Simplificación respecto al prototipo:** el prototipo original guardaba un borrador privado y, al publicar, una copia congelada en storage compartido — dos copias de los mismos datos. Aquí cada portfolio es **una sola fila**: editar siempre edita en vivo, y "Publicar" únicamente marca `published = true` y fija `slug` (si aún no lo tenía). Los cambios posteriores a la publicación son visibles de inmediato en la URL pública, sin paso de "republicar". Esto es una simplificación deliberada del modelo de datos; si en el futuro se quiere un flujo de "borrador vs. publicado" real, requeriría reintroducir una segunda copia (ej. columna `published_snapshot jsonb`).

**RLS (Row Level Security), habilitado en `portfolios`:**
- El dueño (`user_id = auth.uid()`) puede `select`, `insert`, `update`, `delete` sus propias filas.
- Cualquiera, incluyendo usuarios anónimos, puede hacer `select` de una fila donde `published = true` (para servir la vista pública por slug, sin exponer filas no publicadas ni datos de otros usuarios).

### Rutas (`react-router-dom`, `BrowserRouter`)

| ruta | acceso | contenido |
|---|---|---|
| `/` | — | redirige a `/dashboard` si hay sesión, si no a `/login` |
| `/login` | público | formulario email/password (login + registro) y botón "Continuar con Google"; si ya hay sesión, redirige a `/dashboard` |
| `/dashboard` | protegida | lista de portfolios del usuario (título, estado publicado/slug, fecha de actualización); crear nuevo, abrir en editor, eliminar |
| `/editor/:id` | protegida, dueño | editor de un portfolio específico (equivalente al `AdminApp` del prototipo); verifica que `user_id` del registro coincida con el usuario autenticado |
| `/p/:slug` | público | vista pública del portfolio publicado; si no existe o `published=false`, pantalla "no encontrado" |

`vercel.json` incluye un rewrite `"/(.*)" → "/index.html"` para que las rutas funcionen en carga directa / refresh (SPA fallback), ya que Vercel sirve estático por defecto.

### Estructura de archivos

```
portfolio-builder/
  index.html
  vite.config.js
  vercel.json
  package.json
  .env.example                 # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
  src/
    main.jsx
    App.jsx                    # define las rutas
    lib/
      supabaseClient.js
    context/
      AuthContext.jsx          # sesión + user actual, expone hooks
    pages/
      LoginPage.jsx
      DashboardPage.jsx
      EditorPage.jsx           # reemplaza AdminApp
      PublicPortfolioPage.jsx  # reemplaza PublicView
    components/
      admin/
        Field.jsx, Toggle.jsx
        SectionsTab.jsx, ContentTab.jsx, DesignTab.jsx, PreviewTab.jsx
        PublishModal.jsx
        forms/ (HeroForm, AboutForm, ProjectsForm, SkillsForm, ExperienceForm, ContactForm)
      public/
        PortfolioRenderer.jsx
        HeroCentered.jsx, HeroSplit.jsx, AboutBlock.jsx
        ProjectsGrid.jsx, ProjectsList.jsx
        SkillsTags.jsx, SkillsBar.jsx, SkillsRadar.jsx
        ExperienceTimeline.jsx, ExperienceCompact.jsx
        ContactBlock.jsx
    data/
      sectionMeta.js            # SECTION_META
      initialData.js            # getInitialData()
    utils/
      slugify.js, uid.js, initials.js
    styles/
      global.css                 # el mismo CSS del prototipo (GlobalStyles), variables y clases sin cambios
```

### Componentes: qué cambia y qué no

- **Componentes públicos de renderizado** (`Hero*`, `AboutBlock`, `Projects*`, `Skills*`, `Experience*`, `ContactBlock`, `PortfolioRenderer`): puros, reciben `content`/`theme` como props. Se mueven a sus propios archivos **sin cambios de lógica**.
- **Componentes admin** (`Field`, `Toggle`, tabs, forms, `PublishModal`): sin cambios de lógica interna; solo cambia qué los invoca (antes `AdminApp`, ahora `EditorPage`) y de dónde reciben/actualizan datos (antes `data`/`setData` local + `window.storage`, ahora estado local sincronizado con la fila de Supabase).
- **Nuevo:** `AuthContext`, `LoginPage`, `DashboardPage` (no existía nada equivalente en el prototipo — antes solo había un portfolio implícito), `EditorPage`, `PublicPortfolioPage`.

### Flujo de guardado (editor)

Igual que el prototipo: al cambiar `data` (secciones/theme/etc.), debounce de 600ms y luego `update` de la fila en Supabase (`sections`, `theme`, `updated_at`). Indicador "Guardando…" / "Borrador guardado" se mantiene con el mismo comportamiento visual.

### Flujo de publicación

`PublishModal` se mantiene con su misma UI (elegir slug, validación de formato, copiar link). Al confirmar:
1. Verifica que el `slug` esté disponible (no usado por otro registro) — unicidad garantizada por el `unique` constraint; se captura el error de conflicto y se muestra el mismo mensaje de error que ya existe en el modal.
2. `update` de la fila: `slug`, `published = true`, `published_at = now()`.
3. El link a compartir es `https://<dominio-vercel>/p/<slug>` (antes era un fragmento hash relativo).

### Autenticación

`AuthContext` envuelve la app, escucha `supabase.auth.onAuthStateChange`, expone `user`/`session`/`loading`. Rutas protegidas (`/dashboard`, `/editor/:id`) redirigen a `/login` si no hay sesión. `LoginPage` ofrece:
- Formulario de email/password con toggle entre "Iniciar sesión" y "Crear cuenta" (`signInWithPassword` / `signUp`).
- Botón "Continuar con Google" (`signInWithOAuth({ provider: 'google' })`) — requiere configurar el proveedor Google OAuth en el dashboard de Supabase (client ID/secret) antes de poder probarlo end-to-end.

### Deploy

- Repositorio Git nuevo (el directorio actual no es un repo git todavía) — se inicializa como parte de la implementación.
- Vercel: framework preset Vite, build command `vite build`, output `dist`.
- Variables de entorno en Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (clave anónima/pública, segura de exponer en cliente dado el RLS configurado).
- `vercel.json` con rewrite SPA como se describió arriba.

## Fuera de alcance

- Subida de imágenes (Supabase Storage) — la foto de Hero sigue siendo solo URL.
- Snapshot de "publicado" separado del borrador en vivo (ver simplificación arriba).
- Recuperación de contraseña, verificación de email personalizada, u otros flujos de auth avanzados más allá de lo que Supabase Auth ofrece por defecto.
- Analytics, límites de portfolios por usuario, planes de pago.

## Testing

- Verificación manual en navegador (dev server) de: registro/login (email y Google), crear/editar/eliminar portfolio, cambiar secciones/variantes/tema, publicar y visitar `/p/:slug` en una sesión sin auth (o incógnito) para confirmar que RLS permite lectura pública solo de publicados.
- No se introduce suite de tests automatizados nueva — el prototipo original tampoco tenía tests; agregar un framework de testing está fuera del alcance de esta migración salvo que se pida explícitamente.
