# Plantillas de portfolio (paleta + tipografía + layout por preset)

## Contexto

Hoy el "diseño" del portfolio es prácticamente fijo: una sola paleta de colores (`--p-accent` terracota, `--p-bg`/`--p-text` claro u oscuro) y tres fuentes fijas (Fraunces/Inter/JetBrains Mono), cargadas de forma estática vía `@import` en `src/styles/global.css:1`. Lo único configurable hoy es el tema claro/oscuro (`portfolios.theme`) y, por sección, la variante de layout (`sections[].variant`, ej. Hero centrado/split, Proyectos grid/lista) desde el tab "Diseño" del editor (`DesignTab.jsx`).

No existe ningún sistema de plantillas, ni de planes/premium (`grep` de "premium|plan|subscription|stripe" no arroja nada relevante en `src/`).

El pedido es habilitar una sección de "Plantillas": distintos diseños de portfolio completos (paleta, tipografía, forma) que el usuario elige y luego puede seguir personalizando. Se posiciona como una feature "premium y profesional" en el sentido de calidad/percepción del producto — **no** se construye ningún mecanismo de pago o gating en esta iteración; las plantillas quedan libres para todos los usuarios.

## Alcance

- 6 plantillas curadas (Editorial, Mono Terminal, Bold Geométrico, Soft Pastel, Minimal B&N, Corporate Azul), cada una definida como un bundle de tokens de diseño — no como componentes de sección nuevos.
- Nueva columna `portfolios.design` (jsonb) + migración con default no destructivo para las filas existentes.
- Nuevo tab "Plantillas" en el editor, con grid de 6 tarjetas (preview en vivo), confirmación al cambiar de plantilla, y personalización de acento/fuente dentro de la plantilla activa (swatches/parejas curadas + opción "Personalizado").
- Resolución de tokens de diseño → variables CSS aplicadas inline sobre `.pf-scope`, y carga dinámica de Google Fonts para el contenido del portfolio (separada de las fuentes fijas del propio admin).
- Refactor puntual de `global.css` para que radios de borde usen `var(--p-radius)` en vez de valores fijos.
- **Fuera de alcance:** cualquier sistema de planes/pago/gating premium (queda para una iteración futura); miniaturas de plantilla en `DashboardPage`; componentes de sección exclusivos por plantilla (todas reusan `HeroCentered`, `ProjectsGrid`, etc. existentes).

## Diseño

### 1. Modelo de datos

Nueva columna, independiente de `theme` (que se mantiene como eje claro/oscuro ortogonal a la plantilla):

```sql
alter table public.portfolios
  add column design jsonb not null default '{"template":"editorial","accent":{"preset":"default"},"font":{"preset":"default"}}'::jsonb;
```

Forma de `design`:

```json
{
  "template": "mono",
  "accent": { "preset": "neon" },
  "font": { "preset": "default" }
}
```

`accent` es `{ "preset": "<key>" }` (una de las 5 swatches curadas de la plantilla activa) o `{ "custom": "#39FF88" }` (hex elegido con color picker libre). `font` es `{ "preset": "<key>" }` (una de las 2-3 parejas curadas de la plantilla) o `{ "custom": { "display": "Space Grotesk", "body": "Work Sans" } }` (elegido de una lista compartida de ~24 fuentes, ver sección 4). El default de la migración deja los 3 portfolios existentes visualmente idénticos (plantilla Editorial, acento y fuente "default" reproducen los valores que ya están hardcodeados hoy).

### 2. Registro de plantillas (`src/data/templates.js`)

Objeto `TEMPLATES` con las 6 entradas. Cada una define: `palette` (claro+oscuro: `bg`, `bgElevated`, `text`, `muted`, `border`), `radius` (string CSS), `accentPresets` (5 claves, cada una con `label` + `light`/`dark` → `{ accent, accentSoft }`), `fontPairs` (2-3 claves, cada una con `label`, `display`, `body`), y `defaultVariants` (mapa `sectionType → variantKey`, solo para tipos con más de una variante — mismo formato que ya consume `DesignTab`).

Valores de partida (ajustables durante implementación sin cambiar la estructura):

**Editorial** — cálida, cream + terracota. `radius: 14px`.
- Paleta clara: bg `#F5F2EC`, bgElevated `#FBF9F5`, text `#1C1810`, muted `#726B5C`, border `#E4DDCE` (= valores actuales de `global.css`).
- Paleta oscura: bg `#1B1712`, bgElevated `#221E17`, text `#F2ECE0`, muted `#A69C89`, border `#3A342A`.
- Acentos: `default` (terracota `#D97757`/`#E08962`), `salvia` (`#6B8E5A`/`#86AC73`), `petroleo` (`#3D6E8E`/`#5A93B8`), `berry` (`#B85C8A`/`#D480AC`), `mostaza` (`#C9A227`/`#E0BB3F`).
- Fuentes: `default` (Fraunces/Inter), `suave` (Fraunces/Work Sans), `clasica` (Libre Baskerville/Source Sans 3).
- Variantes default: hero=centered, projects=grid, skills=tags, experience=timeline.

**Mono Terminal** — blanco y negro + acento neón, monoespaciada. `radius: 2px`.
- Clara: bg `#F4F4F2`, bgElevated `#FFFFFF`, text `#0F0F0F`, muted `#5C5C5C`, border `#D8D8D4`.
- Oscura: bg `#0B0B0B`, bgElevated `#151515`, text `#F2F2F2`, muted `#8C8C8C`, border `#2A2A2A`.
- Acentos: `default` (neón `#1FAE5C`/`#39FF88`), `ambar` (`#B8790C`/`#FFB86C`), `cian` (`#157F94`/`#56C2E6`), `magenta` (`#B23E85`/`#FF6AC1`), `gris` (`#4A4A4A`/`#B0B0B0`).
- Fuentes: `default` (JetBrains Mono/JetBrains Mono), `plex` (IBM Plex Mono/IBM Plex Mono), `space` (Space Mono/Space Mono).
- Variantes default: hero=split, projects=list, skills=tags, experience=compact.

**Bold Geométrico** — alto contraste, bloques de color plano. `radius: 4px`.
- Clara: bg `#FFE8D6`, bgElevated `#FFFFFF`, text `#1A1A2E`, muted `#5C5C6E`, border `#1A1A2E`.
- Oscura: bg `#1A1A2E`, bgElevated `#24243A`, text `#FFE8D6`, muted `#A6A6BE`, border `#3A3A52`.
- Acentos: `default` (coral `#FF4B3E`/`#FF6B5E`), `azul` (`#2D5BFF`/`#5C82FF`), `lima` (`#8FBF1F`/`#B4FF39`), `violeta` (`#7B3FF2`/`#9C6FFF`), `negro` (`#1A1A2E`/`#FFE8D6`).
- Fuentes: `default` (Archivo Black/Archivo), `grotesk` (Space Grotesk/Space Grotesk), `bricolage` (Bricolage Grotesque/Public Sans).
- Variantes default: hero=split, projects=grid, skills=bar, experience=compact.

**Soft Pastel** — gradientes lavanda/rosa, itálica editorial. `radius: 22px`.
- Clara: bg `linear-gradient(135deg,#FDF4F5,#F3E9F7)`, bgElevated `#FFFFFF`, text `#4A3B57`, muted `#8C7A99`, border `#EBDCEF`.
- Oscura: bg `linear-gradient(135deg,#2A2130,#251E2C)`, bgElevated `#322939`, text `#F3E9F7`, muted `#B9A7C4`, border `#453A4E`.
- Acentos: `default` (lavanda `#B98CC9`/`#D3AEE0`), `rosa` (`#E894B0`/`#F0AEC4`), `durazno` (`#F2A65A`/`#F5BC85`), `menta` (`#7FC9A6`/`#9FDABE`), `cielo` (`#7FA8D9`/`#A3C4E8`).
- Fuentes: `default` (Playfair Display/Nunito Sans), `cormorant` (Cormorant Garamond/Karla), `dm` (DM Serif Display/Manrope).
- Variantes default: hero=centered, projects=grid, skills=radar, experience=timeline.

**Minimal B&N** — blanco y negro, mucho aire. `radius: 6px`.
- Clara: bg `#FFFFFF`, bgElevated `#FAFAFA`, text `#111111`, muted `#6B6B6B`, border `#E5E5E5`.
- Oscura: bg `#111111`, bgElevated `#1A1A1A`, text `#F5F5F5`, muted `#969696`, border `#2E2E2E`.
- Acentos: `default` (negro/blanco `#111111`/`#F5F5F5`), `grafito` (`#444444`/`#B5B5B5`), `terracota-suave` (`#C98A6B`/`#D9A488`), `azul-suave` (`#6B8AAE`/`#93AEC9`), `verde-suave` (`#7A9B7E`/`#9FBBA2`).
- Fuentes: `default` (Inter/Inter), `work` (Work Sans/Work Sans), `outfit` (Outfit/Public Sans).
- Variantes default: hero=split, projects=list, skills=tags, experience=compact.

**Corporate Azul** — navy + azul eléctrico, institucional. `radius: 10px`.
- Clara: bg `#F4F7FB`, bgElevated `#FFFFFF`, text `#0B1F3A`, muted `#5A6B85`, border `#DCE4EF`.
- Oscura: bg `#0B1F3A`, bgElevated `#122A4D`, text `#F4F7FB`, muted `#93A5C0`, border `#1E3A5F`.
- Acentos: `default` (azul eléctrico `#2D6FE0`/`#4DA8FF`), `teal` (`#1E8F7F`/`#2FB6A6`), `dorado` (`#A87A1E`/`#D9A441`), `slate` (`#475569`/`#64748B`), `rojo-corporativo` (`#B3382C`/`#D9564A`).
- Fuentes: `default` (IBM Plex Sans/Inter), `sora` (Sora/Source Sans 3), `public` (Public Sans/Public Sans).
- Variantes default: hero=centered, projects=grid, skills=bar, experience=timeline.

Cada `accentSoft` es el mismo color de acento en `rgba(...)` con alpha `0.12` (claro) / `0.16` (oscuro) — mismo criterio que ya usa Editorial hoy.

### 3. Resolución de tokens → CSS

Nuevo util `src/utils/resolveDesign.js`, función `resolveDesign(design, theme)`:

1. `template = TEMPLATES[design?.template] ?? TEMPLATES.editorial` (fallback para filas legacy o `design` ausente).
2. `palette = template.palette[theme]`.
3. `accent = design.accent?.custom ? { accent: design.accent.custom, accentSoft: hexToSoftRgba(design.accent.custom, theme) } : template.accentPresets[design.accent?.preset ?? 'default'][theme]`.
4. `font = design.font?.custom ?? template.fontPairs[design.font?.preset ?? 'default']`.
5. Devuelve `{ style, fontFamilies }` donde `style` es un objeto de variables CSS inline:

```js
{
  '--p-bg': palette.bg, '--p-bg-elevated': palette.bgElevated, '--p-text': palette.text,
  '--p-muted': palette.muted, '--p-border': palette.border,
  '--p-accent': accent.accent, '--p-accent-soft': accent.accentSoft,
  '--p-radius': template.radius,
  '--font-display': `"${font.display}", serif`,
  '--font-body': `"${font.body}", sans-serif`,
  '--font-mono': `"${font.mono ?? 'JetBrains Mono'}", monospace`,
}
```

y `fontFamilies` es la lista deduplicada `[font.display, font.body, font.mono ?? 'JetBrains Mono']`, usada para cargar las fuentes (sección 4). `hexToSoftRgba(hex, theme)` es un helper nuevo y pequeño (parseo hex→rgb + alpha `0.12`/`0.16` según `theme`) para el caso de acento personalizado.

`PortfolioRenderer.jsx` llama `resolveDesign(design, theme)` y aplica `style` como prop `style` del div `.pf-scope` existente (además del `data-theme={theme}` que ya tiene). Como es un CSS custom property seteado en ese contenedor, cascada hacia sus hijos sin afectar nada fuera de él — el resto del admin (`.adm-*`) sigue usando los valores de `:root` en `global.css`, que no cambian.

### 4. Fuentes: separar "fuente de la app" de "fuente del portfolio"

El `@import` estático de Google Fonts en `global.css:1` (Fraunces/Inter/JetBrains Mono) se mantiene tal cual — sigue gobernando la tipografía fija del propio admin (`.adm-*`) vía las variables de `:root`. Como esas son también los valores por defecto de la plantilla Editorial, no hay carga de red adicional para el caso más común (portfolio nuevo, plantilla Editorial).

Cuando el usuario elige otra plantilla o pareja de fuente, `PortfolioRenderer` necesita cargar las familias adicionales. Nuevo util `src/utils/loadGoogleFonts.js`:

```js
export function ensureGoogleFonts(families) {
  const href = `https://fonts.googleapis.com/css2?${families
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join('&')}&display=swap`;
  let link = document.getElementById('pf-google-fonts');
  if (!link) {
    link = document.createElement('link');
    link.id = 'pf-google-fonts';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}
```

`PortfolioRenderer` llama `ensureGoogleFonts(fontFamilies)` en un `useEffect` con `fontFamilies.join(',')` como dependencia. Un único `<link>` compartido (id fijo) evita acumular tags al cambiar de plantilla en el editor — cada cambio reescribe el `href`. Esto corre igual en `PublicPortfolioPage` (visitantes) y en `PreviewTab` (editor, sin iframe — ambos renderizan `PortfolioRenderer` directamente), así que el preview en vivo del editor siempre muestra la tipografía real.

Lista compartida de fuentes "Personalizado" (`src/data/customFonts.js`, ~24 entradas, usada tanto para "display" como para "body" en el selector libre): Fraunces, Playfair Display, DM Serif Display, Cormorant Garamond, Libre Baskerville, Archivo Black, Big Shoulders Display, Space Grotesk, Bricolage Grotesque, Sora, Inter, Work Sans, Nunito Sans, IBM Plex Sans, Source Sans 3, Karla, Manrope, Public Sans, Archivo, Outfit, JetBrains Mono, Space Mono, IBM Plex Mono, Fira Code.

### 5. UI del editor

**Nuevo tab "Plantillas"** (`src/components/admin/TemplatesTab.jsx`), agregado a `adm-studio-subtabs` en `EditorPage.jsx` en la posición: Plantillas, Secciones, Diseño. El tab seleccionado por defecto al abrir el editor sigue siendo `'sections'` (no cambia el flujo de edición de contenido existente); el usuario navega a "Plantillas" explícitamente.

- Grid de 6 tarjetas (una por `TEMPLATES`), cada una con un mini-preview renderizado con los tokens reales de esa plantilla (nombre + rol de ejemplo, como los mockups validados) y su nombre/descripción corta.
- Click en una plantilla distinta a `portfolio.design.template` → modal de confirmación (reutiliza el patrón visual de `PublishModal.jsx`) con texto explícito: cambiar de plantilla reemplaza color, fuente y las variantes de sección actuales por los defaults de la nueva plantilla. Confirmar aplica:
  ```js
  design: { template: id, accent: { preset: 'default' }, font: { preset: 'default' } }
  sections: sections.map((s) => TEMPLATES[id].defaultVariants[s.type]
    ? { ...s, variant: TEMPLATES[id].defaultVariants[s.type] } : s)
  ```
  Cancelar no cambia nada.
- Debajo del grid, cuando hay una plantilla activa: fila de 5 swatches de acento (círculos de color, igual que en los mockups) + una sexta opción "Personalizado" que abre un `<input type="color">`; y fila de 2-3 parejas de fuente (tarjetas con el nombre en su propia tipografía) + opción "Personalizado" que despliega dos `<select>` (título/cuerpo) poblados desde `customFonts.js`. Cambiar acento o fuente actualiza solo `design.accent`/`design.font` — no dispara el modal de confirmación ni toca `sections`.
- El tab "Diseño" (`DesignTab.jsx`) no cambia: sigue mostrando el claro/oscuro y las variantes por sección, ahora coexistiendo con "Plantillas".

**`EditorPage.jsx`**:
- Agrega `design` al estado inicial de `portfolio` (ya viene de la fila cargada con `select('*')`, sin cambios en la query).
- Nuevos callbacks `applyTemplate(id)`, `setAccent(accent)`, `setFont(font)` (análogos a `setVariant`/`setTheme` ya existentes).
- El efecto de autoguardado agrega `design: portfolio.design` al payload de `update(...)` (ambos lugares: el `setTimeout` debounced y el guardado best-effort al desmontar) y `portfolio.design` a su arreglo de dependencias.
- `PreviewTab` recibe la nueva prop `design` y la reenvía a `PortfolioRenderer`.

**`PortfolioRenderer.jsx`**: recibe prop `design`, calcula `resolveDesign(design, theme)`, aplica `style` inline en `.pf-scope` y dispara `ensureGoogleFonts`.

**`PublicPortfolioPage.jsx`**: agrega `design` al `select(...)` inicial (`'id, user_id, sections, theme, design'`) y lo pasa a `PortfolioRenderer`.

### 6. CSS — radios configurables

En `global.css`, los border-radius actualmente fijos de contenedores rectangulares pasan a `var(--p-radius, 14px)` (el `14px` de fallback mantiene el comportamiento actual si `--p-radius` no está seteado): `.pf-avatar`/foto de hero, `.pf-about-photo`, `.pf-project-card`. Los elementos tipo "pill" (`.pf-skill-tag`, `.pf-contact-link`, `.pf-cv-download`, con `border-radius: 999px`) **no** cambian — son una forma intencionalmente redondeada en todas las plantillas, no parte del token de radio general.

## Verificación

- Con el dev server corriendo: abrir el editor de un portfolio existente, ir al tab "Plantillas" nuevo, confirmar que las 6 tarjetas muestran preview distinguible (color/fuente/forma).
- Elegir una plantilla distinta a Editorial → confirmar que aparece el modal de aviso, aceptar, y verificar en el preview en vivo (`PreviewTab`) que cambian paleta, tipografía, radio y las variantes de sección por defecto.
- Cambiar un swatch de acento y una pareja de fuente dentro de la plantilla activa → verificar que actualiza sin disparar el modal y sin tocar las variantes de sección.
- Probar "Personalizado" en color (hex arbitrario) y en fuente (par de Google Fonts de la lista) → verificar que carga la tipografía nueva (Network tab, request a `fonts.googleapis.com`) y que `accentSoft` se ve coherente.
- Guardar, recargar el editor, y publicar → abrir `/p/:slug` en una pestaña nueva y confirmar que el portfolio público refleja exactamente la plantilla/acento/fuente elegidos.
- Verificar que un portfolio existente (creado antes de esta migración) sigue viéndose igual que antes del cambio — la migración con default no debe alterar nada visualmente.
