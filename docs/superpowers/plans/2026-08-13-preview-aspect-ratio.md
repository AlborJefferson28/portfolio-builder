# Pantalla simulada del preview: tamaño fijo por aspect-ratio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el estiramiento vía `flex: 1` de la pantalla simulada del preview (feature anterior) por un tamaño con proporción fija (`aspect-ratio: 16/9` en Escritorio, `9/19.5` en Móvil), dimensionado por el alto disponible de la columna y acotado en ancho, sin generar scroll fuera de la pantalla simulada.

**Architecture:** Cambio puramente CSS en `src/styles/global.css`. `.adm-device-frame` pasa de `flex: 1; min-height: 0` (estirarse a llenar el alto del flex-parent) a `height: 100%; width: auto` con `aspect-ratio` fijo por variante (`.is-desktop`/`.is-mobile`) y `max-width` como límite superior. `.adm-preview-frame` sigue siendo quien crece dentro de `.adm-device-frame` (`flex: 1; min-height: 0`) y scrollea internamente — sin cambios respecto a la feature anterior. Bajo 900px se resetean `height`/`width`/`aspect-ratio` a los valores previos a esta feature (igual que ya se neutralizaba `flex:1` antes).

**Tech Stack:** CSS plano (`aspect-ratio`, `min()`), sin JS ni cambios de componentes.

## Global Constraints

- No hay framework de testing en el proyecto. Verificación: `npm run build` pasando + revisión manual con `npm run dev`.
- No se agregan dependencias nuevas ni tokens CSS nuevos.
- No se toca `PreviewTab.jsx` ni ningún otro componente — solo `src/styles/global.css`.
- No se cambia el comportamiento bajo 900px (layout apilado ya establecido) más allá de mantenerlo intacto.
- `.adm-browser-chrome`/`.adm-phone-notch` y su ocultamiento bajo 900px, de features anteriores, no se modifican.
- `.adm-studio-preview .adm-preview-frame { overflow-y: auto; flex: 1; min-height: 0; }` (scroll interno del contenido) no cambia — sigue siendo la feature anterior tal cual.

---

## Task 1: Aspect-ratio fijo para `.adm-device-frame` dentro de la columna de preview

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: ningún selector nuevo fuera de lo scoped a `.adm-studio-preview .adm-device-frame` — no cambia ninguna interfaz de componente.

- [ ] **Step 1: Reemplazar el estiramiento por flex del `.adm-device-frame` scoped por proporción fija**

Localizar con `grep -n "adm-studio-preview .adm-device-frame" src/styles/global.css`. Reemplazar la línea:

```css
.adm-studio-preview .adm-device-frame { flex: 1; min-height: 0; }
```

por:

```css
.adm-studio-preview .adm-device-frame { height: 100%; width: auto; max-width: min(900px, 100%); }
.adm-studio-preview .adm-device-frame.is-desktop { aspect-ratio: 16 / 9; }
.adm-studio-preview .adm-device-frame.is-mobile { aspect-ratio: 9 / 19.5; max-width: min(380px, 100%); }
```

La línea `.adm-studio-preview .adm-preview-frame { max-height: none; flex: 1; min-height: 0; overflow-y: auto; }` (inmediatamente después) **no cambia** — se deja tal cual está.

- [ ] **Step 2: Resetear el aspect-ratio bajo 900px**

Localizar el bloque `@media (max-width: 900px)` que contiene `.adm-studio-preview .adm-device-frame { flex: none; }` (buscar con `grep -n "adm-studio-preview .adm-device-frame { flex: none" src/styles/global.css`). Reemplazar esa línea por:

```css
  .adm-studio-preview .adm-device-frame,
  .adm-studio-preview .adm-device-frame.is-desktop,
  .adm-studio-preview .adm-device-frame.is-mobile {
    height: auto; width: 100%; aspect-ratio: auto;
  }
```

El resto del bloque de media query (`.adm-studio-body`, `.adm-studio-sidebar`, `.adm-studio-preview { display: block; overflow: visible; }`, `.adm-studio-preview .adm-preview-wrap { flex: none; }`, `.adm-studio-preview .adm-preview-frame { flex: none; max-height: none; overflow-y: visible; }`) no cambia.

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificación manual**

Run: `npm run dev`, abrir `/editor/<id>`.
Expected:
- ≥900px, Escritorio: la pantalla simulada tiene proporción ancha tipo monitor (16:9), centrada, sin tocar los bordes de la columna, sin generar scroll fuera de sí misma.
- ≥900px, Móvil: la pantalla simulada tiene proporción alta y angosta (9:19.5), centrada, sin desbordar.
- Redimensionar la ventana más baja/más alta: la pantalla simulada cambia de tamaño manteniendo su proporción; nunca aparece scroll en la columna, solo dentro de la pantalla simulada si el contenido del portfolio no entra.
- Bajo 900px: comportamiento idéntico al que había antes de esta feature (sin aspect-ratio, caja simple creciendo con el contenido, scroll de página normal).

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: give preview simulated screens a fixed aspect ratio instead of stretching to fill"
```

---

## Self-Review Notes

- **Cobertura del spec:** Sección "Diseño" (aspect-ratio 16:9/9:19.5, dimensionado por alto disponible con ancho derivado y acotado, reset bajo 900px) → Task 1, Steps 1-2. Verificación → Task 1, Step 4.
- **Placeholders:** ninguno — el CSS de cada step está completo.
- **Consistencia de especificidad:** el reset bajo 900px (Step 2) incluye explícitamente los selectores `.is-desktop`/`.is-mobile` (no solo el selector base `.adm-device-frame`) porque las reglas de `aspect-ratio` del Step 1 tienen mayor especificidad (tres clases: `.adm-studio-preview .adm-device-frame.is-desktop`) que un reset genérico de dos clases — sin igualar esa especificidad, el reset no ganaría la cascada y el aspect-ratio quedaría aplicado incorrectamente por debajo de 900px.
