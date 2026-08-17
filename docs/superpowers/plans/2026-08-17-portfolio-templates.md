# Plantillas de portfolio (paleta + tipografía + layout por preset) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un tab "Plantillas" al editor donde el usuario elige entre 6 plantillas curadas (paleta + tipografía + radio de esquina + variantes de sección por defecto), y luego puede personalizar el acento de color y la pareja de fuente dentro de la plantilla activa (con opción "Personalizado" en ambos).

**Architecture:** Registro de datos puro `src/data/templates.js` (6 plantillas, cada una un bundle de tokens) resuelto en tiempo de render por `src/utils/resolveDesign.js` a variables CSS aplicadas inline sobre el `.pf-scope` de `PortfolioRenderer.jsx`. Las fuentes de Google se cargan dinámicamente vía `src/utils/loadGoogleFonts.js` (un único `<link>` compartido, separado de la tipografía fija del admin). Nueva columna `portfolios.design` (jsonb) persiste la elección. El editor gana un tab nuevo `TemplatesTab.jsx` (grid de plantillas + swatches de acento + parejas de fuente) con un modal de confirmación `TemplateSwitchModal.jsx` al cambiar de plantilla. No hay componentes de sección nuevos — las 6 plantillas reutilizan `HeroCentered`, `ProjectsGrid`, etc. ya existentes.

**Tech Stack:** React (componentes existentes, sin librerías nuevas), CSS plano en `src/styles/global.css`, Supabase (migración de columna).

## Global Constraints

- Proyecto Supabase: `dzannfaklwjhmkoauokq` (`portfolio-builder`). La migración se aplica ahí vía la tool MCP `apply_migration`.
- No hay framework de testing en el proyecto. Verificación: `npm run build` pasando + revisión manual con `npm run dev` en el navegador (no hay `vitest`/`jest` instalado).
- Sin gating premium/pago en esta iteración — las 6 plantillas quedan libres para todos los usuarios (confirmado con el usuario durante el brainstorming).
- `src/components/admin/AppSidebar.jsx` ya tiene un ítem de navegación "Templates" (icono `LayoutTemplate`, `enabled: false`, badge "Próximamente"). Es un placeholder no relacionado con esta feature — el selector real de plantillas vive dentro del editor de cada portfolio (`/editor/:id`), no como página independiente del dashboard. **No se toca `AppSidebar.jsx` en este plan.**
- Al unificar los border-radius bajo el token `--p-radius`, la plantilla Editorial pasa a usar `14px` en `.pf-project-card`, `.pf-hero-split .pf-hero-visual` y `.pf-project-image-frame` (antes eran `14px`/`16px`/`8px` respectivamente, valores hardcodeados inconsistentes entre sí). Es un ajuste visual menor e intencional (≤6px de diferencia, imperceptible en la práctica), no una regresión a evitar.
- Solo la plantilla Soft Pastel usa `font-style: italic` en sus encabezados (vía `--font-display-style`); el resto usa `normal`.
- `sectionMeta.js`/`DesignTab.jsx` no cambian — las variantes por sección siguen funcionando exactamente igual, ahora también seteables en bloque al elegir una plantilla.

---

## Task 1: Migración — columna `portfolios.design`

**Files:**
- Ninguno en el repo — migración SQL aplicada vía MCP de Supabase.

**Interfaces:**
- Produces: columna `public.portfolios.design` (jsonb, `not null`, default `{"template":"editorial","accent":{"preset":"default"},"font":{"preset":"default"}}`). Todas las tasks siguientes asumen que esta columna existe con este nombre y esta forma para las filas nuevas y existentes.

- [ ] **Step 1: Aplicar la migración**

Usar la tool MCP `apply_migration` con `project_id: "dzannfaklwjhmkoauokq"`, `name: "portfolios_design_column"` y esta query:

```sql
alter table public.portfolios
  add column design jsonb not null default '{"template":"editorial","accent":{"preset":"default"},"font":{"preset":"default"}}'::jsonb;
```

Expected: la migración se aplica sin errores.

- [ ] **Step 2: Verificar la columna y el backfill**

Usar la tool MCP `execute_sql` con `project_id: "dzannfaklwjhmkoauokq"`:

```sql
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_name = 'portfolios' and column_name = 'design';
```

Expected: 1 fila, `data_type = jsonb`, `is_nullable = NO`, `column_default` conteniendo el jsonb de arriba.

```sql
select id, design from public.portfolios;
```

Expected: las 3 filas existentes ya tienen `design = {"template": "editorial", "accent": {"preset": "default"}, "font": {"preset": "default"}}` (backfill automático de Postgres al agregar la columna con default).

- [ ] **Step 3: Commit**

No hay archivos de repo que commitear en esta tarea. Continuar directamente a la Task 2.

---

## Task 2: Registro de plantillas (`src/data/templates.js` + `src/data/customFonts.js`)

**Files:**
- Create: `src/data/templates.js`
- Create: `src/data/customFonts.js`

**Interfaces:**
- Produces: `TEMPLATES` (objeto exportado desde `templates.js`, claves `editorial`, `mono`, `bold`, `pastel`, `minimal`, `corporate`). Cada entrada tiene la forma:
  ```
  {
    id: string, label: string, description: string,
    radius: string,               // ej. '14px'
    displayStyle?: 'italic',      // solo 'pastel' lo define
    palette: { light: { bg, bgElevated, text, muted, border }, dark: { ...mismo shape } },
    accentPresets: { [key]: { label, light: { accent, accentSoft }, dark: { accent, accentSoft } } },
    fontPairs: { [key]: { label, display, body, mono } },
    defaultVariants: { [sectionType]: variantKey },
  }
  ```
  Consumida por Task 3 (`resolveDesign`), Task 5 (`EditorPage.applyTemplate`) y Task 7 (`TemplatesTab`).
- Produces: `CUSTOM_FONTS` (array exportado desde `customFonts.js`, 24 strings de nombres de familia de Google Fonts). Consumida por Task 7 (selects de "Personalizado").

- [ ] **Step 1: Crear `src/data/templates.js`**

```js
export const TEMPLATES = {
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    description: 'Cálida y editorial: cream, terracota y Fraunces.',
    radius: '14px',
    palette: {
      light: { bg: '#F5F2EC', bgElevated: '#FBF9F5', text: '#1C1810', muted: '#726B5C', border: '#E4DDCE' },
      dark: { bg: '#1B1712', bgElevated: '#221E17', text: '#F2ECE0', muted: '#A69C89', border: '#3A342A' },
    },
    accentPresets: {
      default: { label: 'Terracota', light: { accent: '#D97757', accentSoft: 'rgba(217,119,87,0.12)' }, dark: { accent: '#E08962', accentSoft: 'rgba(224,137,98,0.14)' } },
      salvia: { label: 'Salvia', light: { accent: '#6B8E5A', accentSoft: 'rgba(107,142,90,0.12)' }, dark: { accent: '#86AC73', accentSoft: 'rgba(134,172,115,0.16)' } },
      petroleo: { label: 'Petróleo', light: { accent: '#3D6E8E', accentSoft: 'rgba(61,110,142,0.12)' }, dark: { accent: '#5A93B8', accentSoft: 'rgba(90,147,184,0.16)' } },
      berry: { label: 'Berry', light: { accent: '#B85C8A', accentSoft: 'rgba(184,92,138,0.12)' }, dark: { accent: '#D480AC', accentSoft: 'rgba(212,128,172,0.16)' } },
      mostaza: { label: 'Mostaza', light: { accent: '#C9A227', accentSoft: 'rgba(201,162,39,0.12)' }, dark: { accent: '#E0BB3F', accentSoft: 'rgba(224,187,63,0.16)' } },
    },
    fontPairs: {
      default: { label: 'Fraunces + Inter', display: 'Fraunces', body: 'Inter', mono: 'JetBrains Mono' },
      suave: { label: 'Fraunces + Work Sans', display: 'Fraunces', body: 'Work Sans', mono: 'JetBrains Mono' },
      clasica: { label: 'Libre Baskerville + Source Sans', display: 'Libre Baskerville', body: 'Source Sans 3', mono: 'JetBrains Mono' },
    },
    defaultVariants: { hero: 'centered', projects: 'grid', skills: 'tags', experience: 'timeline' },
  },
  mono: {
    id: 'mono',
    label: 'Mono Terminal',
    description: 'Blanco y negro con acento neón, todo en monoespaciada.',
    radius: '2px',
    palette: {
      light: { bg: '#F4F4F2', bgElevated: '#FFFFFF', text: '#0F0F0F', muted: '#5C5C5C', border: '#D8D8D4' },
      dark: { bg: '#0B0B0B', bgElevated: '#151515', text: '#F2F2F2', muted: '#8C8C8C', border: '#2A2A2A' },
    },
    accentPresets: {
      default: { label: 'Neón', light: { accent: '#1FAE5C', accentSoft: 'rgba(31,174,92,0.12)' }, dark: { accent: '#39FF88', accentSoft: 'rgba(57,255,136,0.14)' } },
      ambar: { label: 'Ámbar', light: { accent: '#B8790C', accentSoft: 'rgba(184,121,12,0.12)' }, dark: { accent: '#FFB86C', accentSoft: 'rgba(255,184,108,0.16)' } },
      cian: { label: 'Cian', light: { accent: '#157F94', accentSoft: 'rgba(21,127,148,0.12)' }, dark: { accent: '#56C2E6', accentSoft: 'rgba(86,194,230,0.16)' } },
      magenta: { label: 'Magenta', light: { accent: '#B23E85', accentSoft: 'rgba(178,62,133,0.12)' }, dark: { accent: '#FF6AC1', accentSoft: 'rgba(255,106,193,0.16)' } },
      gris: { label: 'Gris', light: { accent: '#4A4A4A', accentSoft: 'rgba(74,74,74,0.12)' }, dark: { accent: '#B0B0B0', accentSoft: 'rgba(176,176,176,0.16)' } },
    },
    fontPairs: {
      default: { label: 'JetBrains Mono', display: 'JetBrains Mono', body: 'JetBrains Mono', mono: 'JetBrains Mono' },
      plex: { label: 'IBM Plex Mono', display: 'IBM Plex Mono', body: 'IBM Plex Mono', mono: 'IBM Plex Mono' },
      space: { label: 'Space Mono', display: 'Space Mono', body: 'Space Mono', mono: 'Space Mono' },
    },
    defaultVariants: { hero: 'split', projects: 'list', skills: 'tags', experience: 'compact' },
  },
  bold: {
    id: 'bold',
    label: 'Bold Geométrico',
    description: 'Alto contraste, tipografía pesada y bloques de color.',
    radius: '4px',
    palette: {
      light: { bg: '#FFE8D6', bgElevated: '#FFFFFF', text: '#1A1A2E', muted: '#5C5C6E', border: '#1A1A2E' },
      dark: { bg: '#1A1A2E', bgElevated: '#24243A', text: '#FFE8D6', muted: '#A6A6BE', border: '#3A3A52' },
    },
    accentPresets: {
      default: { label: 'Coral', light: { accent: '#FF4B3E', accentSoft: 'rgba(255,75,62,0.14)' }, dark: { accent: '#FF6B5E', accentSoft: 'rgba(255,107,94,0.18)' } },
      azul: { label: 'Azul', light: { accent: '#2D5BFF', accentSoft: 'rgba(45,91,255,0.14)' }, dark: { accent: '#5C82FF', accentSoft: 'rgba(92,130,255,0.18)' } },
      lima: { label: 'Lima', light: { accent: '#8FBF1F', accentSoft: 'rgba(143,191,31,0.14)' }, dark: { accent: '#B4FF39', accentSoft: 'rgba(180,255,57,0.18)' } },
      violeta: { label: 'Violeta', light: { accent: '#7B3FF2', accentSoft: 'rgba(123,63,242,0.14)' }, dark: { accent: '#9C6FFF', accentSoft: 'rgba(156,111,255,0.18)' } },
      negro: { label: 'Negro', light: { accent: '#1A1A2E', accentSoft: 'rgba(26,26,46,0.10)' }, dark: { accent: '#FFE8D6', accentSoft: 'rgba(255,232,214,0.14)' } },
    },
    fontPairs: {
      default: { label: 'Archivo Black + Archivo', display: 'Archivo Black', body: 'Archivo', mono: 'JetBrains Mono' },
      grotesk: { label: 'Space Grotesk', display: 'Space Grotesk', body: 'Space Grotesk', mono: 'JetBrains Mono' },
      bricolage: { label: 'Bricolage + Public Sans', display: 'Bricolage Grotesque', body: 'Public Sans', mono: 'JetBrains Mono' },
    },
    defaultVariants: { hero: 'split', projects: 'grid', skills: 'bar', experience: 'compact' },
  },
  pastel: {
    id: 'pastel',
    label: 'Soft Pastel',
    description: 'Gradientes suaves, serif itálica y colores pastel.',
    radius: '22px',
    displayStyle: 'italic',
    palette: {
      light: { bg: 'linear-gradient(135deg,#FDF4F5,#F3E9F7)', bgElevated: '#FFFFFF', text: '#4A3B57', muted: '#8C7A99', border: '#EBDCEF' },
      dark: { bg: 'linear-gradient(135deg,#2A2130,#251E2C)', bgElevated: '#322939', text: '#F3E9F7', muted: '#B9A7C4', border: '#453A4E' },
    },
    accentPresets: {
      default: { label: 'Lavanda', light: { accent: '#B98CC9', accentSoft: 'rgba(185,140,201,0.16)' }, dark: { accent: '#D3AEE0', accentSoft: 'rgba(211,174,224,0.18)' } },
      rosa: { label: 'Rosa', light: { accent: '#E894B0', accentSoft: 'rgba(232,148,176,0.16)' }, dark: { accent: '#F0AEC4', accentSoft: 'rgba(240,174,196,0.18)' } },
      durazno: { label: 'Durazno', light: { accent: '#F2A65A', accentSoft: 'rgba(242,166,90,0.16)' }, dark: { accent: '#F5BC85', accentSoft: 'rgba(245,188,133,0.18)' } },
      menta: { label: 'Menta', light: { accent: '#7FC9A6', accentSoft: 'rgba(127,201,166,0.16)' }, dark: { accent: '#9FDABE', accentSoft: 'rgba(159,218,190,0.18)' } },
      cielo: { label: 'Cielo', light: { accent: '#7FA8D9', accentSoft: 'rgba(127,168,217,0.16)' }, dark: { accent: '#A3C4E8', accentSoft: 'rgba(163,196,232,0.18)' } },
    },
    fontPairs: {
      default: { label: 'Playfair + Nunito Sans', display: 'Playfair Display', body: 'Nunito Sans', mono: 'JetBrains Mono' },
      cormorant: { label: 'Cormorant + Karla', display: 'Cormorant Garamond', body: 'Karla', mono: 'JetBrains Mono' },
      dm: { label: 'DM Serif + Manrope', display: 'DM Serif Display', body: 'Manrope', mono: 'JetBrains Mono' },
    },
    defaultVariants: { hero: 'centered', projects: 'grid', skills: 'radar', experience: 'timeline' },
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal B&N',
    description: 'Blanco y negro, mucho espacio en blanco, sin adornos.',
    radius: '6px',
    palette: {
      light: { bg: '#FFFFFF', bgElevated: '#FAFAFA', text: '#111111', muted: '#6B6B6B', border: '#E5E5E5' },
      dark: { bg: '#111111', bgElevated: '#1A1A1A', text: '#F5F5F5', muted: '#969696', border: '#2E2E2E' },
    },
    accentPresets: {
      default: { label: 'Negro/Blanco', light: { accent: '#111111', accentSoft: 'rgba(17,17,17,0.08)' }, dark: { accent: '#F5F5F5', accentSoft: 'rgba(245,245,245,0.12)' } },
      grafito: { label: 'Grafito', light: { accent: '#444444', accentSoft: 'rgba(68,68,68,0.08)' }, dark: { accent: '#B5B5B5', accentSoft: 'rgba(181,181,181,0.12)' } },
      'terracota-suave': { label: 'Terracota suave', light: { accent: '#C98A6B', accentSoft: 'rgba(201,138,107,0.12)' }, dark: { accent: '#D9A488', accentSoft: 'rgba(217,164,136,0.16)' } },
      'azul-suave': { label: 'Azul suave', light: { accent: '#6B8AAE', accentSoft: 'rgba(107,138,174,0.12)' }, dark: { accent: '#93AEC9', accentSoft: 'rgba(147,174,201,0.16)' } },
      'verde-suave': { label: 'Verde suave', light: { accent: '#7A9B7E', accentSoft: 'rgba(122,155,126,0.12)' }, dark: { accent: '#9FBBA2', accentSoft: 'rgba(159,187,162,0.16)' } },
    },
    fontPairs: {
      default: { label: 'Inter', display: 'Inter', body: 'Inter', mono: 'JetBrains Mono' },
      work: { label: 'Work Sans', display: 'Work Sans', body: 'Work Sans', mono: 'JetBrains Mono' },
      outfit: { label: 'Outfit + Public Sans', display: 'Outfit', body: 'Public Sans', mono: 'JetBrains Mono' },
    },
    defaultVariants: { hero: 'split', projects: 'list', skills: 'tags', experience: 'compact' },
  },
  corporate: {
    id: 'corporate',
    label: 'Corporate Azul',
    description: 'Navy y azul eléctrico, tipografía institucional.',
    radius: '10px',
    palette: {
      light: { bg: '#F4F7FB', bgElevated: '#FFFFFF', text: '#0B1F3A', muted: '#5A6B85', border: '#DCE4EF' },
      dark: { bg: '#0B1F3A', bgElevated: '#122A4D', text: '#F4F7FB', muted: '#93A5C0', border: '#1E3A5F' },
    },
    accentPresets: {
      default: { label: 'Azul eléctrico', light: { accent: '#2D6FE0', accentSoft: 'rgba(45,111,224,0.12)' }, dark: { accent: '#4DA8FF', accentSoft: 'rgba(77,168,255,0.16)' } },
      teal: { label: 'Teal', light: { accent: '#1E8F7F', accentSoft: 'rgba(30,143,127,0.12)' }, dark: { accent: '#2FB6A6', accentSoft: 'rgba(47,182,166,0.16)' } },
      dorado: { label: 'Dorado', light: { accent: '#A87A1E', accentSoft: 'rgba(168,122,30,0.12)' }, dark: { accent: '#D9A441', accentSoft: 'rgba(217,164,65,0.16)' } },
      slate: { label: 'Slate', light: { accent: '#475569', accentSoft: 'rgba(71,85,105,0.12)' }, dark: { accent: '#64748B', accentSoft: 'rgba(100,116,139,0.16)' } },
      'rojo-corporativo': { label: 'Rojo corporativo', light: { accent: '#B3382C', accentSoft: 'rgba(179,56,44,0.12)' }, dark: { accent: '#D9564A', accentSoft: 'rgba(217,86,74,0.16)' } },
    },
    fontPairs: {
      default: { label: 'IBM Plex Sans + Inter', display: 'IBM Plex Sans', body: 'Inter', mono: 'JetBrains Mono' },
      sora: { label: 'Sora + Source Sans', display: 'Sora', body: 'Source Sans 3', mono: 'JetBrains Mono' },
      public: { label: 'Public Sans', display: 'Public Sans', body: 'Public Sans', mono: 'JetBrains Mono' },
    },
    defaultVariants: { hero: 'centered', projects: 'grid', skills: 'bar', experience: 'timeline' },
  },
};
```

- [ ] **Step 2: Crear `src/data/customFonts.js`**

```js
export const CUSTOM_FONTS = [
  'Fraunces', 'Playfair Display', 'DM Serif Display', 'Cormorant Garamond', 'Libre Baskerville',
  'Archivo Black', 'Big Shoulders Display', 'Space Grotesk', 'Bricolage Grotesque', 'Sora',
  'Inter', 'Work Sans', 'Nunito Sans', 'IBM Plex Sans', 'Source Sans 3',
  'Karla', 'Manrope', 'Public Sans', 'Archivo', 'Outfit',
  'JetBrains Mono', 'Space Mono', 'IBM Plex Mono', 'Fira Code',
];
```

- [ ] **Step 3: Verificar que ambos módulos importan sin errores**

Run: `node -e "import('./src/data/templates.js').then((m) => console.log(Object.keys(m.TEMPLATES)))"`
Expected: `[ 'editorial', 'mono', 'bold', 'pastel', 'minimal', 'corporate' ]`

Run: `node -e "import('./src/data/customFonts.js').then((m) => console.log(m.CUSTOM_FONTS.length))"`
Expected: `24`

- [ ] **Step 4: Commit**

```bash
git add src/data/templates.js src/data/customFonts.js
git commit -m "feat: agregar registro de plantillas de portfolio"
```

---

## Task 3: Utils `resolveDesign` y `loadGoogleFonts`

**Files:**
- Create: `src/utils/resolveDesign.js`
- Create: `src/utils/loadGoogleFonts.js`

**Interfaces:**
- Consumes: `TEMPLATES` de `src/data/templates.js` (Task 2).
- Produces: `resolveDesign(design, theme)` → `{ style: object, fontFamilies: string[], templateId: string }`, donde `style` son variables CSS listas para pasar como prop `style` de un elemento React. `design` puede ser `undefined`/`null` (fallback a la plantilla `editorial`, preset `default` de acento y fuente). Consumida por Task 4 (`PortfolioRenderer.jsx`).
- Produces: `ensureGoogleFonts(families: string[])` → sin retorno, efecto secundario sobre `document.head`. Consumida por Task 4 (`PortfolioRenderer.jsx`).

- [ ] **Step 1: Crear `src/utils/resolveDesign.js`**

```js
import { TEMPLATES } from '../data/templates.js';

function hexToSoftRgba(hex, theme) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const alpha = theme === 'dark' ? 0.16 : 0.12;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function resolveDesign(design, theme) {
  const template = TEMPLATES[design && design.template] || TEMPLATES.editorial;
  const palette = template.palette[theme];

  const accentChoice = (design && design.accent) || { preset: 'default' };
  const accent = accentChoice.custom
    ? { accent: accentChoice.custom, accentSoft: hexToSoftRgba(accentChoice.custom, theme) }
    : template.accentPresets[accentChoice.preset || 'default'][theme];

  const fontChoice = (design && design.font) || { preset: 'default' };
  const font = fontChoice.custom || template.fontPairs[fontChoice.preset || 'default'];
  const mono = font.mono || 'JetBrains Mono';

  const style = {
    '--p-bg': palette.bg,
    '--p-bg-elevated': palette.bgElevated,
    '--p-text': palette.text,
    '--p-muted': palette.muted,
    '--p-border': palette.border,
    '--p-accent': accent.accent,
    '--p-accent-soft': accent.accentSoft,
    '--p-radius': template.radius,
    '--font-display': `"${font.display}", serif`,
    '--font-body': `"${font.body}", sans-serif`,
    '--font-mono': `"${mono}", monospace`,
    '--font-display-style': template.displayStyle || 'normal',
  };

  const fontFamilies = Array.from(new Set([font.display, font.body, mono]));

  return { style, fontFamilies, templateId: template.id };
}
```

- [ ] **Step 2: Crear `src/utils/loadGoogleFonts.js`**

```js
const LINK_ID = 'pf-google-fonts';

export function ensureGoogleFonts(families) {
  const unique = Array.from(new Set(families)).filter(Boolean);
  if (unique.length === 0) return;
  const href = `https://fonts.googleapis.com/css2?${unique
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join('&')}&display=swap`;
  let link = document.getElementById(LINK_ID);
  if (!link) {
    link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}
```

- [ ] **Step 3: Verificar `resolveDesign` con datos de ejemplo**

Run:
```bash
node -e "
import('./src/utils/resolveDesign.js').then(({ resolveDesign }) => {
  const editorial = resolveDesign(undefined, 'light');
  console.log('editorial accent:', editorial.style['--p-accent']);
  console.log('editorial fonts:', editorial.fontFamilies);

  const mono = resolveDesign({ template: 'mono', accent: { preset: 'cian' }, font: { preset: 'plex' } }, 'dark');
  console.log('mono accent:', mono.style['--p-accent']);
  console.log('mono radius:', mono.style['--p-radius']);
  console.log('mono fonts:', mono.fontFamilies);

  const custom = resolveDesign({ template: 'editorial', accent: { custom: '#123456' }, font: { preset: 'default' } }, 'light');
  console.log('custom accentSoft:', custom.style['--p-accent-soft']);
});
"
```
Expected:
```
editorial accent: #D97757
editorial fonts: [ 'Fraunces', 'Inter', 'JetBrains Mono' ]
mono accent: #56C2E6
mono radius: 2px
mono fonts: [ 'IBM Plex Mono' ]
custom accentSoft: rgba(18, 52, 86, 0.12)
```

Nota: `ensureGoogleFonts` no se verifica con Node porque usa `document` (API de navegador) — se verifica en el navegador en la Task 4.

- [ ] **Step 4: Commit**

```bash
git add src/utils/resolveDesign.js src/utils/loadGoogleFonts.js
git commit -m "feat: agregar resolveDesign y carga dinámica de Google Fonts"
```

---

## Task 4: CSS de radio/estilo de fuente + wiring en `PortfolioRenderer.jsx`

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/components/public/PortfolioRenderer.jsx`

**Interfaces:**
- Consumes: `resolveDesign` y `ensureGoogleFonts` (Task 3).
- Produces: `PortfolioRenderer` acepta una nueva prop `design` (además de `sections`, `theme`, `onTrack` ya existentes) y aplica los tokens resueltos al `.pf-scope`. Consumida por Task 5 (`PreviewTab.jsx`, `PublicPortfolioPage.jsx`).

- [ ] **Step 1: Actualizar `src/styles/global.css` — radios configurables**

En la línea 785 (`.pf-hero-split .pf-hero-visual`), cambiar:
```css
.pf-hero-split .pf-hero-visual {
  aspect-ratio: 4/5; border-radius: 16px; background: var(--p-accent-soft); display: flex;
  align-items: center; justify-content: center; font-family: var(--font-display); font-size: 60px;
  color: var(--p-accent); overflow: hidden; border: 1px solid var(--p-border);
}
```
por:
```css
.pf-hero-split .pf-hero-visual {
  aspect-ratio: 4/5; border-radius: var(--p-radius, 16px); background: var(--p-accent-soft); display: flex;
  align-items: center; justify-content: center; font-family: var(--font-display); font-size: 60px;
  color: var(--p-accent); overflow: hidden; border: 1px solid var(--p-border);
}
```

En la línea 798 (`.pf-project-card`), cambiar:
```css
.pf-project-card {
  border: 1px solid var(--p-border); border-radius: 14px; padding: 22px; background: var(--p-bg-elevated);
  display: flex; flex-direction: column; gap: 10px; transition: transform 0.15s, border-color 0.15s;
}
```
por:
```css
.pf-project-card {
  border: 1px solid var(--p-border); border-radius: var(--p-radius, 14px); padding: 22px; background: var(--p-bg-elevated);
  display: flex; flex-direction: column; gap: 10px; transition: transform 0.15s, border-color 0.15s;
}
```

En la línea 810 (`.pf-project-image-frame`), cambiar:
```css
.pf-project-image-frame { width: 100%; aspect-ratio: 16/9; border-radius: 8px; overflow: hidden; }
```
por:
```css
.pf-project-image-frame { width: 100%; aspect-ratio: 16/9; border-radius: var(--p-radius, 8px); overflow: hidden; }
```

- [ ] **Step 2: Actualizar `src/styles/global.css` — estilo de fuente de display**

Justo después del bloque `.pf-scope[data-theme="dark"] { ... }` (línea 722) y antes de `.pf-page { ... }` (línea 723), agregar una línea en blanco y esta nueva regla:

```css
.pf-hero-name, .pf-hero-split .pf-hero-visual, .pf-project-title, .pf-timeline-role, .pf-contact-email, .pf-status-title {
  font-style: var(--font-display-style, normal);
}
```

- [ ] **Step 3: Actualizar `src/components/public/PortfolioRenderer.jsx`**

```jsx
import { useEffect, useMemo } from 'react';
import { SECTION_COMPONENTS } from './sectionComponents.js';
import { resolveDesign } from '../../utils/resolveDesign.js';
import { ensureGoogleFonts } from '../../utils/loadGoogleFonts.js';

export default function PortfolioRenderer({ sections, theme, design, onTrack }) {
  const active = sections.filter((s) => s.enabled);
  const { style, fontFamilies, templateId } = useMemo(() => resolveDesign(design, theme), [design, theme]);
  const fontFamiliesKey = fontFamilies.join(',');

  useEffect(() => {
    ensureGoogleFonts(fontFamilies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontFamiliesKey]);

  return (
    <div className="pf-scope" data-theme={theme} data-template={templateId} style={style}>
      <div className="pf-page">
        {active.length === 0 && (
          <div className="pf-section" style={{ textAlign: 'center', color: 'var(--p-muted)' }}>
            <p>Activa al menos una sección para ver tu portfolio aquí.</p>
          </div>
        )}
        {active.map((section) => {
          const variants = SECTION_COMPONENTS[section.type];
          const Comp = variants ? (variants[section.variant] || Object.values(variants)[0]) : null;
          return Comp ? <Comp key={section.id} content={section.content} onTrack={onTrack} /> : null;
        })}
        <footer className="pf-colophon">
          <p>Tipografía: Fraunces · Inter · JetBrains Mono</p>
        </footer>
      </div>
    </div>
  );
}
```

Nota: el `<footer className="pf-colophon">` sigue mostrando el texto fijo "Fraunces · Inter · JetBrains Mono" — es un dato de copy, no de layout; queda igual en esta iteración (no forma parte del alcance del spec).

- [ ] **Step 4: Verificar en el navegador (sin regresión, `design` aún no se pasa desde ningún caller)**

Run: `npm run build`
Expected: build exitoso, sin errores de import.

Iniciar el dev server (`npm run dev` vía la tool de preview), abrir el editor de un portfolio existente, ir al tab "Vista previa". Como ningún caller pasa todavía la prop `design` (Task 5), `resolveDesign(undefined, theme)` cae al fallback `editorial`/`default`/`default` — el portfolio debe verse exactamente igual que antes de este cambio (mismo color terracota, misma tipografía Fraunces/Inter, mismas esquinas redondeadas). Confirmar con las tools del navegador:
- `read_console_messages` sin errores nuevos.
- `read_network_requests` con `urlPattern: "fonts.googleapis"` — debe verse una request a `fonts.googleapis.com` con `family=Fraunces...&family=Inter...&family=JetBrains+Mono...` (la misma tipografía de siempre, ahora cargada dinámicamente en vez de por el `@import` estático — el `@import` de `global.css` línea 1 sigue existiendo para la tipografía fija del admin, así que puede haber dos requests a Fraunces/Inter/JetBrains Mono; ambas son válidas y el navegador deduplica por caché).

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/components/public/PortfolioRenderer.jsx
git commit -m "feat: resolver tokens de diseño y cargar fuentes dinámicamente en PortfolioRenderer"
```

---

## Task 5: Encadenar `design` por el resto de la app (sin UI nueva todavía)

**Files:**
- Modify: `src/pages/PublicPortfolioPage.jsx:26-28`
- Modify: `src/components/admin/PreviewTab.jsx`
- Modify: `src/pages/EditorPage.jsx`

**Interfaces:**
- Consumes: `PortfolioRenderer` con prop `design` (Task 4).
- Produces: `portfolio.design` disponible en el estado de `EditorPage`, persistido en el autoguardado, y pasado a `PreviewTab`/`PortfolioRenderer`. `PublicPortfolioPage` selecciona y pasa `design` también. Ninguna UI nueva todavía — la única forma de cambiar `design` sigue siendo editar la fila directamente en la base (no hace falta para verificar esta task, ver Step 5).

- [ ] **Step 1: `src/pages/PublicPortfolioPage.jsx` — incluir `design` en el select**

Cambiar (línea 26-30):
```js
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, user_id, sections, theme')
        .eq('slug', slug)
        .eq('published', true)
        .single();
```
por:
```js
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, user_id, sections, theme, design')
        .eq('slug', slug)
        .eq('published', true)
        .single();
```

Y en el render (línea 133), cambiar:
```jsx
      <PortfolioRenderer sections={portfolio.sections} theme={portfolio.theme} onTrack={handleTrack} />
```
por:
```jsx
      <PortfolioRenderer sections={portfolio.sections} theme={portfolio.theme} design={portfolio.design} onTrack={handleTrack} />
```

- [ ] **Step 2: `src/components/admin/PreviewTab.jsx` — recibir y pasar `design`**

Reemplazar el archivo completo:

```jsx
import { Monitor, Smartphone } from 'lucide-react';
import PortfolioRenderer from '../public/PortfolioRenderer.jsx';

export default function PreviewTab({ sections, theme, design, viewport, onViewportChange }) {
  return (
    <div className="adm-preview-wrap">
      <div className="adm-preview-toolbar">
        <div className="adm-segmented">
          <button type="button" className={viewport === 'desktop' ? 'is-active' : ''} onClick={() => onViewportChange('desktop')}>
            <Monitor size={14} /> Escritorio
          </button>
          <button type="button" className={viewport === 'mobile' ? 'is-active' : ''} onClick={() => onViewportChange('mobile')}>
            <Smartphone size={14} /> Móvil
          </button>
        </div>
      </div>
      <div className={`adm-device-frame ${viewport === 'mobile' ? 'is-mobile' : 'is-desktop'}`}>
        {viewport === 'desktop' && (
          <div className="adm-browser-chrome" aria-hidden="true">
            <span className="adm-browser-dot adm-browser-dot-red" />
            <span className="adm-browser-dot adm-browser-dot-yellow" />
            <span className="adm-browser-dot adm-browser-dot-green" />
            <span className="adm-browser-url">portfolio.studio</span>
          </div>
        )}
        {viewport === 'mobile' && <div className="adm-phone-notch" aria-hidden="true" />}
        <div className={`adm-preview-frame ${viewport === 'mobile' ? 'is-mobile' : ''}`}>
          <PortfolioRenderer sections={sections} theme={theme} design={design} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `src/pages/EditorPage.jsx` — estado, autoguardado y prop passthrough**

Cambiar el efecto de autoguardado (líneas 67-102). Reemplazar:
```js
    setSaveState('saving');
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .update({ sections: portfolio.sections, theme: portfolio.theme, title: portfolio.title, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
```
por:
```js
    setSaveState('saving');
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .update({ sections: portfolio.sections, theme: portfolio.theme, design: portfolio.design, title: portfolio.title, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
```

Y el guardado best-effort al desmontar, cambiar:
```js
        supabase
          .from('portfolios')
          .update({ sections: portfolio.sections, theme: portfolio.theme, title: portfolio.title, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('id')
          .then(({ data, error }) => {
            if (!error && data && data.length > 0) cleanupOrphanedImages(portfolio.sections);
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio && portfolio.sections, portfolio && portfolio.theme, portfolio && portfolio.title]);
```
por:
```js
        supabase
          .from('portfolios')
          .update({ sections: portfolio.sections, theme: portfolio.theme, design: portfolio.design, title: portfolio.title, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('id')
          .then(({ data, error }) => {
            if (!error && data && data.length > 0) cleanupOrphanedImages(portfolio.sections);
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio && portfolio.sections, portfolio && portfolio.theme, portfolio && portfolio.design, portfolio && portfolio.title]);
```

Y el render de `PreviewTab` (línea 240), cambiar:
```jsx
          <PreviewTab sections={portfolio.sections} theme={portfolio.theme} viewport={viewport} onViewportChange={setViewport} />
```
por:
```jsx
          <PreviewTab sections={portfolio.sections} theme={portfolio.theme} design={portfolio.design} viewport={viewport} onViewportChange={setViewport} />
```

- [ ] **Step 4: Verificar sin regresión**

Run: `npm run build`
Expected: build exitoso.

Abrir el editor de un portfolio existente en el navegador. Confirmar que se ve exactamente igual que antes (`resolveDesign` recibe ahora el `design` real de la fila, que el backfill de la Task 1 dejó en `{"template":"editorial","accent":{"preset":"default"},"font":{"preset":"default"}}` — visualmente idéntico al fallback usado en la Task 4). Hacer un cambio trivial de contenido (ej. editar el nombre del hero), esperar el autoguardado ("Guardado hace unos segundos"), y confirmar con la tool MCP `execute_sql` (`select design from public.portfolios where id = '<id>'`) que la fila sigue teniendo el `design` esperado sin corromperse.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PublicPortfolioPage.jsx src/components/admin/PreviewTab.jsx src/pages/EditorPage.jsx
git commit -m "feat: encadenar el campo design por PublicPortfolioPage, PreviewTab y EditorPage"
```

---

## Task 6: `TemplateSwitchModal.jsx`

**Files:**
- Create: `src/components/admin/TemplateSwitchModal.jsx`

**Interfaces:**
- Produces: `TemplateSwitchModal` con props `{ open: boolean, templateLabel: string, onConfirm: () => void, onCancel: () => void }`. Consumido por la Task 7 (`TemplatesTab.jsx`) — no se conecta a ningún flujo real en esta tarea (verificación solo por build, mismo patrón que `ImageFrameModal.jsx` en `docs/superpowers/plans/2026-08-14-image-frame-modal.md`).
- Consumes: clases CSS ya existentes (`adm-modal-overlay`, `adm-modal`, `adm-modal-close`, `adm-modal-title`, `adm-modal-desc`, `adm-modal-actions`, `adm-btn-primary`, `adm-link-btn`) — no requiere CSS nuevo.

- [ ] **Step 1: Crear `src/components/admin/TemplateSwitchModal.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function TemplateSwitchModal({ open, templateLabel, onConfirm, onCancel }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) { setEntered(false); return undefined; }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className={`adm-modal-overlay${entered ? ' is-entered' : ''}`} onClick={onCancel}>
      <div className={`adm-modal${entered ? ' is-entered' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="adm-modal-close" onClick={onCancel} aria-label="Cerrar"><X size={18} /></button>
        <h2 className="adm-modal-title">Cambiar a &quot;{templateLabel}&quot;</h2>
        <p className="adm-modal-desc">
          Esto va a reemplazar tu color de acento, tu fuente y las variantes de layout de cada sección por los valores por defecto de esta plantilla. El contenido (textos, imágenes) no se toca.
        </p>
        <div className="adm-modal-actions">
          <button type="button" className="adm-btn-primary" onClick={onConfirm}>Aplicar plantilla</button>
          <button type="button" className="adm-link-btn" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build exitoso, sin componentes sin usar que rompan el build (Vite no falla por exports no usados).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/TemplateSwitchModal.jsx
git commit -m "feat: agregar TemplateSwitchModal"
```

---

## Task 7: `TemplatesTab.jsx` + CSS + wiring final en `EditorPage.jsx`

**Files:**
- Create: `src/components/admin/TemplatesTab.jsx`
- Modify: `src/styles/global.css`
- Modify: `src/pages/EditorPage.jsx`

**Interfaces:**
- Consumes: `TEMPLATES` (Task 2), `CUSTOM_FONTS` (Task 2), `TemplateSwitchModal` (Task 6).
- Produces: `TemplatesTab` con props `{ design, theme, onApplyTemplate: (templateId) => void, onAccentChange: (accent) => void, onFontChange: (font) => void }`. `EditorPage` produce y pasa `applyTemplate`, `setAccent`, `setFont` con esas firmas exactas.

- [ ] **Step 1: Agregar CSS del grid de plantillas y swatches a `src/styles/global.css`**

Agregar al final del archivo (después de la última regla, línea 896):

```css

/* ---------- Plantillas ---------- */
.adm-template-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 26px; }
.adm-template-card {
  display: flex; flex-direction: column; gap: 8px; text-align: left; border: 1px solid var(--a-border);
  background: var(--a-panel); border-radius: 10px; padding: 10px; cursor: pointer; font-family: var(--font-body);
  color: var(--a-text); position: relative;
}
.adm-template-card.is-active { border-color: var(--a-accent); background: #FBF0EA; }
.adm-template-preview {
  height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; overflow: hidden;
}
.adm-template-preview-name { font-size: 16px; font-weight: 600; }
.adm-template-preview-role { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
.adm-template-card-title { font-size: 13px; font-weight: 600; }
.adm-template-card-desc { font-size: 11.5px; color: var(--a-muted); line-height: 1.4; }
.adm-template-card-badge {
  position: absolute; top: 8px; right: 8px; font-family: var(--font-mono); font-size: 9.5px;
  text-transform: uppercase; letter-spacing: 0.03em; color: #2E7A52; background: #E3F1E8;
  padding: 2px 7px; border-radius: 999px;
}

.adm-swatch-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.adm-swatch {
  width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; cursor: pointer;
  padding: 0; box-shadow: 0 0 0 1px var(--a-border);
}
.adm-swatch.is-active { border-color: var(--a-panel); box-shadow: 0 0 0 2px var(--a-accent); }
.adm-swatch-custom {
  background: var(--a-bg); display: flex; align-items: center; justify-content: center;
  color: var(--a-muted); font-size: 14px; border: 1px dashed var(--a-border); box-shadow: none;
}
.adm-swatch-color-input { width: 30px; height: 30px; padding: 0; border: none; background: none; cursor: pointer; }
.adm-custom-font-row { display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
.adm-custom-font-row .adm-field { flex: 1; min-width: 160px; }

html[data-admin-theme="dark"] .adm-template-card.is-active { background: #2A211C; }
```

- [ ] **Step 2: Crear `src/components/admin/TemplatesTab.jsx`**

```jsx
import { useState } from 'react';
import { TEMPLATES } from '../../data/templates.js';
import { CUSTOM_FONTS } from '../../data/customFonts.js';
import TemplateSwitchModal from './TemplateSwitchModal.jsx';

const TEMPLATE_IDS = Object.keys(TEMPLATES);
const DEFAULT_CUSTOM_COLOR = '#D97757';

function TemplateMiniPreview({ template, theme }) {
  const palette = template.palette[theme];
  const accent = template.accentPresets.default[theme];
  const font = template.fontPairs.default;
  return (
    <div className="adm-template-preview" style={{ background: palette.bg, borderRadius: template.radius }}>
      <span
        className="adm-template-preview-name"
        style={{ fontFamily: `"${font.display}", serif`, fontStyle: template.displayStyle || 'normal', color: palette.text }}
      >
        Ana Torres
      </span>
      <span
        className="adm-template-preview-role"
        style={{ fontFamily: `"${font.mono || 'JetBrains Mono'}", monospace`, color: accent.accent }}
      >
        Product Designer
      </span>
    </div>
  );
}

export default function TemplatesTab({ design, theme, onApplyTemplate, onAccentChange, onFontChange }) {
  const [pendingTemplateId, setPendingTemplateId] = useState(null);
  const [customColorValue, setCustomColorValue] = useState(DEFAULT_CUSTOM_COLOR);
  const [customFontDisplay, setCustomFontDisplay] = useState(CUSTOM_FONTS[0]);
  const [customFontBody, setCustomFontBody] = useState(CUSTOM_FONTS[0]);

  const currentTemplateId = design.template;
  const currentTemplate = TEMPLATES[currentTemplateId];
  const isCustomAccent = Boolean(design.accent && design.accent.custom);
  const isCustomFont = Boolean(design.font && design.font.custom);

  const handleCardClick = (id) => {
    if (id === currentTemplateId) return;
    setPendingTemplateId(id);
  };

  const confirmSwitch = () => {
    onApplyTemplate(pendingTemplateId);
    setPendingTemplateId(null);
  };

  return (
    <div className="adm-panel">
      <h2 className="adm-panel-title">Plantillas</h2>
      <p className="adm-panel-desc">Elige un estilo completo para tu portfolio: paleta, tipografía y layout por defecto.</p>

      <div className="adm-template-grid">
        {TEMPLATE_IDS.map((id) => {
          const template = TEMPLATES[id];
          const isActive = id === currentTemplateId;
          return (
            <button
              type="button"
              key={id}
              className={`adm-template-card ${isActive ? 'is-active' : ''}`}
              onClick={() => handleCardClick(id)}
            >
              <TemplateMiniPreview template={template} theme={theme} />
              <span className="adm-template-card-title">{template.label}</span>
              <span className="adm-template-card-desc">{template.description}</span>
              {isActive && <span className="adm-template-card-badge">Activa</span>}
            </button>
          );
        })}
      </div>

      <div className="adm-variant-block">
        <span className="adm-field-label">Acento</span>
        <div className="adm-swatch-row">
          {Object.entries(currentTemplate.accentPresets).map(([key, preset]) => (
            <button
              type="button"
              key={key}
              className={`adm-swatch ${!isCustomAccent && design.accent.preset === key ? 'is-active' : ''}`}
              style={{ background: preset[theme].accent }}
              title={preset.label}
              aria-label={preset.label}
              onClick={() => onAccentChange({ preset: key })}
            />
          ))}
          <button
            type="button"
            className={`adm-swatch adm-swatch-custom ${isCustomAccent ? 'is-active' : ''}`}
            onClick={() => onAccentChange({ custom: customColorValue })}
            title="Personalizado"
            aria-label="Personalizado"
          >
            +
          </button>
          {isCustomAccent && (
            <input
              type="color"
              className="adm-swatch-color-input"
              value={design.accent.custom}
              onChange={(e) => {
                setCustomColorValue(e.target.value);
                onAccentChange({ custom: e.target.value });
              }}
            />
          )}
        </div>
      </div>

      <div className="adm-variant-block">
        <span className="adm-field-label">Fuente</span>
        <div className="adm-variant-options">
          {Object.entries(currentTemplate.fontPairs).map(([key, pair]) => (
            <button
              type="button"
              key={key}
              className={`adm-variant-card ${!isCustomFont && design.font.preset === key ? 'is-active' : ''}`}
              onClick={() => onFontChange({ preset: key })}
            >
              <span className="adm-variant-card-title" style={{ fontFamily: `"${pair.display}", serif` }}>{pair.label}</span>
              <span className="adm-variant-card-desc">{pair.display} + {pair.body}</span>
            </button>
          ))}
          <button
            type="button"
            className={`adm-variant-card ${isCustomFont ? 'is-active' : ''}`}
            onClick={() => onFontChange({ custom: { display: customFontDisplay, body: customFontBody } })}
          >
            <span className="adm-variant-card-title">Personalizado</span>
            <span className="adm-variant-card-desc">Elige título y cuerpo</span>
          </button>
        </div>
        {isCustomFont && (
          <div className="adm-custom-font-row">
            <label className="adm-field">
              <span className="adm-field-label">Título</span>
              <select
                className="adm-input"
                value={design.font.custom.display}
                onChange={(e) => {
                  setCustomFontDisplay(e.target.value);
                  onFontChange({ custom: { display: e.target.value, body: design.font.custom.body } });
                }}
              >
                {CUSTOM_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label className="adm-field">
              <span className="adm-field-label">Cuerpo</span>
              <select
                className="adm-input"
                value={design.font.custom.body}
                onChange={(e) => {
                  setCustomFontBody(e.target.value);
                  onFontChange({ custom: { display: design.font.custom.display, body: e.target.value } });
                }}
              >
                {CUSTOM_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      <TemplateSwitchModal
        open={pendingTemplateId !== null}
        templateLabel={pendingTemplateId ? TEMPLATES[pendingTemplateId].label : ''}
        onConfirm={confirmSwitch}
        onCancel={() => setPendingTemplateId(null)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Wirear en `src/pages/EditorPage.jsx`**

Cambiar el import de iconos (línea 3):
```js
import { Layers, Palette, ExternalLink, ArrowLeft, Share2 } from 'lucide-react';
```
por:
```js
import { Layers, Palette, LayoutTemplate, ExternalLink, ArrowLeft, Share2 } from 'lucide-react';
```

Agregar imports nuevos justo debajo del import de `DesignTab` (línea 7):
```js
import DesignTab from '../components/admin/DesignTab.jsx';
```
pasa a:
```js
import DesignTab from '../components/admin/DesignTab.jsx';
import TemplatesTab from '../components/admin/TemplatesTab.jsx';
import { TEMPLATES } from '../data/templates.js';
```

Agregar los callbacks nuevos después de `setTheme` (línea 131):
```js
  const setTheme = useCallback((theme) => setPortfolio((p) => ({ ...p, theme })), []);
```
pasa a:
```js
  const setTheme = useCallback((theme) => setPortfolio((p) => ({ ...p, theme })), []);
  const applyTemplate = useCallback((templateId) => {
    setPortfolio((p) => ({
      ...p,
      design: { template: templateId, accent: { preset: 'default' }, font: { preset: 'default' } },
      sections: p.sections.map((s) => {
        const defaultVariant = TEMPLATES[templateId].defaultVariants[s.type];
        return defaultVariant ? { ...s, variant: defaultVariant } : s;
      }),
    }));
  }, []);
  const setAccent = useCallback((accent) => {
    setPortfolio((p) => ({ ...p, design: { ...p.design, accent } }));
  }, []);
  const setFont = useCallback((font) => {
    setPortfolio((p) => ({ ...p, design: { ...p.design, font } }));
  }, []);
```

Cambiar el bloque de tabs y su contenido (líneas 218-237):
```jsx
          <nav className="adm-studio-subtabs">
            <button className={sidebarTab === 'sections' ? 'is-active' : ''} onClick={() => setSidebarTab('sections')}>
              <Layers size={14} /> Secciones
            </button>
            <button className={sidebarTab === 'design' ? 'is-active' : ''} onClick={() => setSidebarTab('design')}>
              <Palette size={14} /> Diseño
            </button>
          </nav>
          {sidebarTab === 'sections' && (
            <SectionsContentTab
              sections={portfolio.sections}
              onToggle={toggleSection}
              onMove={moveSection}
              onUpdateContent={updateSectionContent}
              portfolioId={id}
            />
          )}
          {sidebarTab === 'design' && (
            <DesignTab sections={portfolio.sections} theme={portfolio.theme} onVariantChange={setVariant} onThemeChange={setTheme} />
          )}
```
por:
```jsx
          <nav className="adm-studio-subtabs">
            <button className={sidebarTab === 'templates' ? 'is-active' : ''} onClick={() => setSidebarTab('templates')}>
              <LayoutTemplate size={14} /> Plantillas
            </button>
            <button className={sidebarTab === 'sections' ? 'is-active' : ''} onClick={() => setSidebarTab('sections')}>
              <Layers size={14} /> Secciones
            </button>
            <button className={sidebarTab === 'design' ? 'is-active' : ''} onClick={() => setSidebarTab('design')}>
              <Palette size={14} /> Diseño
            </button>
          </nav>
          {sidebarTab === 'templates' && (
            <TemplatesTab
              design={portfolio.design}
              theme={portfolio.theme}
              onApplyTemplate={applyTemplate}
              onAccentChange={setAccent}
              onFontChange={setFont}
            />
          )}
          {sidebarTab === 'sections' && (
            <SectionsContentTab
              sections={portfolio.sections}
              onToggle={toggleSection}
              onMove={moveSection}
              onUpdateContent={updateSectionContent}
              portfolioId={id}
            />
          )}
          {sidebarTab === 'design' && (
            <DesignTab sections={portfolio.sections} theme={portfolio.theme} onVariantChange={setVariant} onThemeChange={setTheme} />
          )}
```

- [ ] **Step 4: Verificación end-to-end en el navegador**

Run: `npm run build` — expected: build exitoso.

Con el dev server corriendo, abrir el editor de un portfolio existente:
1. Ir al tab "Plantillas" nuevo (primero en la lista). Confirmar que se ven las 6 tarjetas con mini-preview distinguible (color de fondo, nombre en la tipografía del template, "Product Designer" en el color de acento).
2. Click en una tarjeta distinta a la activa (ej. "Mono Terminal") → confirmar que aparece `TemplateSwitchModal` con el texto de aviso. Click en "Aplicar plantilla".
3. Confirmar en el tab "Vista previa" que cambian: fondo, tipografía (Network tab: nueva request a `fonts.googleapis.com` con `JetBrains+Mono`), radio de esquina (cuadrado en vez de redondeado), y que el Hero pasó a la variante `split` (verificar también en el tab "Diseño" que la variante seleccionada de Hero ahora es "Editorial dividido").
4. Click en un swatch de acento distinto al activo (ej. "Cian") → confirmar que el acento cambia en el preview sin abrir ningún modal y sin tocar las variantes de sección.
5. Click en "Personalizado" (swatch) → confirmar que aparece un `<input type="color">`, elegir un color, confirmar que se aplica.
6. Click en una pareja de fuente distinta (ej. "Space Mono") → confirmar que cambia la tipografía en el preview.
7. Click en "Personalizado" (fuente) → confirmar que aparecen los dos `<select>`, elegir "Playfair Display" (título) y "Manrope" (cuerpo), confirmar que se aplica en el preview.
8. Esperar el autoguardado ("Guardado hace unos segundos"), recargar la página del editor (F5), y confirmar que la plantilla/acento/fuente elegidos persisten (no vuelven a Editorial).
9. Publicar el portfolio (o usar uno ya publicado) y abrir `/p/:slug` en una pestaña nueva — confirmar que el portfolio público refleja exactamente la plantilla/acento/fuente elegidos en el paso 3-7.
10. Volver a "Plantillas" y elegir "Editorial" para dejar el portfolio de prueba en su estado original (limpieza).

Usar las tools del navegador: `computer` (clicks), `read_page` (confirmar textos/estados activos), `read_network_requests` (confirmar requests de fuentes), `computer {action: "screenshot"}` para verificación visual final de al menos 2 plantillas distintas (ej. Editorial y Mono Terminal) lado a lado.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/TemplatesTab.jsx src/styles/global.css src/pages/EditorPage.jsx
git commit -m "feat: agregar tab de Plantillas al editor con selector de acento y fuente"
```

---

## Self-Review

**Cobertura del spec:**
- Modelo de datos (`portfolios.design`) → Task 1.
- Registro de 6 plantillas con tokens → Task 2.
- Resolución de tokens → CSS + carga dinámica de fuentes → Task 3, Task 4.
- Refactor de radios (`--p-radius`) → Task 4.
- UI: tab "Plantillas", grid, modal de confirmación, swatches/parejas con "Personalizado" → Task 6, Task 7.
- Plumbing (`EditorPage`, `PreviewTab`, `PublicPortfolioPage`, autoguardado) → Task 5, Task 7.
- Migración no destructiva para portfolios existentes → Task 1 (backfill automático), verificado en Task 4/5 (regresión visual).
- Fuera de alcance (gating premium, `AppSidebar.jsx`, componentes por plantilla) → explícitamente excluido en Global Constraints, ninguna task lo toca.

**Escaneo de placeholders:** sin `TBD`/`TODO`; todos los pasos de código tienen contenido completo (los 6 templates con sus 5 acentos y 3 parejas de fuente cada uno están escritos en su totalidad en la Task 2).

**Consistencia de tipos/nombres:** `resolveDesign(design, theme)` (Task 3) devuelve `{ style, fontFamilies, templateId }` — mismos tres nombres usados en `PortfolioRenderer.jsx` (Task 4). `TemplatesTab` recibe `onApplyTemplate`/`onAccentChange`/`onFontChange` (Task 7, Step 2) — mismos nombres de prop que `EditorPage.jsx` pasa (Task 7, Step 3: `onApplyTemplate={applyTemplate}` etc.). `TemplateSwitchModal` recibe `templateLabel`/`onConfirm`/`onCancel` (Task 6) — mismos nombres usados por `TemplatesTab` al instanciarlo (Task 7, Step 2). Claves de `TEMPLATES[id].defaultVariants` (`hero`, `projects`, `skills`, `experience`) coinciden con `section.type` tal como los define `initialData.js` y `sectionMeta.js`.
