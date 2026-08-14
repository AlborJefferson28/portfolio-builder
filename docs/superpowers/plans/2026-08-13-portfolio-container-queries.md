# Contenido del portfolio responsive al contenedor (container queries) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el contenido del portfolio (`.pf-*`, compartido entre el preview del editor y `/p/:slug`) se adapte al ancho de su contenedor real en vez de al viewport del navegador, para que la pantalla simulada del editor (Escritorio 16:9 / Móvil 9:19.5) muestre el contenido reacomodado a su tamaño real.

**Architecture:** Cambio puramente CSS en `src/styles/global.css`. `.pf-scope` gana `container-type: inline-size` para convertirse en contenedor de tamaño. Las 3 reglas que usan `vw` cambian a `cqw` (mismo valor numérico). El `@media (max-width: 640px)` existente se divide: la regla `.adm-main` (no relacionada) se queda en el `@media`, las 2 reglas `pf-*` se mueven a un `@container (max-width: 640px)` nuevo.

**Tech Stack:** CSS Container Queries (`container-type`, `cqw`, `@container`), sin JS ni cambios de componentes.

## Global Constraints

- No hay framework de testing en el proyecto. Verificación: `npm run build` pasando + revisión manual con `npm run dev`.
- No se agregan dependencias nuevas.
- No se toca `PreviewTab.jsx`, `PortfolioRenderer.jsx`, ni ningún componente — solo `src/styles/global.css`.
- No se toca ninguna regla `.pf-*` fuera de las 3 `clamp()` con `vw` y las 2 reglas del `@media (max-width: 640px)` mencionadas — el resto del sistema `.pf-*` ya es responsive vía grid `auto-fit`/`flex-wrap` y no necesita cambios.
- No se agregan fallbacks para navegadores sin soporte de container queries.
- El valor numérico de cada `clamp()` y el umbral `640px` no cambian — solo la unidad/mecanismo de medición (viewport → contenedor).

---

## Task 1: Container queries en `.pf-scope`

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: ningún selector nuevo — modifica reglas `.pf-*` existentes in-place. No cambia ninguna interfaz de componente.

- [ ] **Step 1: Agregar `container-type: inline-size` a `.pf-scope`**

Localizar con `grep -n "^\.pf-scope {" src/styles/global.css`. Reemplazar:

```css
.pf-scope {
  --p-bg: #F5F2EC; --p-bg-elevated: #FBF9F5; --p-text: #1C1810; --p-muted: #726B5C;
  --p-border: #E4DDCE; --p-accent: #D97757; --p-accent-soft: rgba(217,119,87,0.12);
}
```

por:

```css
.pf-scope {
  --p-bg: #F5F2EC; --p-bg-elevated: #FBF9F5; --p-text: #1C1810; --p-muted: #726B5C;
  --p-border: #E4DDCE; --p-accent: #D97757; --p-accent-soft: rgba(217,119,87,0.12);
  container-type: inline-size;
}
```

- [ ] **Step 2: Cambiar los 3 `clamp()` de `vw` a `cqw`**

Localizar y reemplazar (buscar cada línea con `grep -n` antes de editar, ya que pueden haberse movido):

```css
.pf-hero-name { font-family: var(--font-display); font-size: clamp(36px, 7vw, 58px); font-weight: 600; margin: 0 0 6px; line-height: 1.05; }
```
por:
```css
.pf-hero-name { font-family: var(--font-display); font-size: clamp(36px, 7cqw, 58px); font-weight: 600; margin: 0 0 6px; line-height: 1.05; }
```

```css
.pf-hero-split .pf-hero-name { font-size: clamp(32px, 5.5vw, 50px); }
```
por:
```css
.pf-hero-split .pf-hero-name { font-size: clamp(32px, 5.5cqw, 50px); }
```

```css
.pf-contact-email {
  font-family: var(--font-display); font-size: clamp(22px, 4vw, 32px); color: var(--p-accent);
  text-decoration: none; display: inline-block; margin-bottom: 24px; word-break: break-word;
}
```
por:
```css
.pf-contact-email {
  font-family: var(--font-display); font-size: clamp(22px, 4cqw, 32px); color: var(--p-accent);
  text-decoration: none; display: inline-block; margin-bottom: 24px; word-break: break-word;
}
```

- [ ] **Step 3: Separar las reglas `pf-*` del `@media (max-width: 640px)` en un `@container` nuevo**

Localizar con `grep -n "max-width: 640px" src/styles/global.css`. Reemplazar:

```css
@media (max-width: 640px) {
  .adm-main { padding: 20px 14px 50px; }
  .pf-project-row { grid-template-columns: 30px 1fr; }
  .pf-hero-split .pf-hero-visual { max-width: 260px; margin: 0 auto; aspect-ratio: 1/1; }
}
```

por:

```css
@media (max-width: 640px) {
  .adm-main { padding: 20px 14px 50px; }
}
@container (max-width: 640px) {
  .pf-project-row { grid-template-columns: 30px 1fr; }
  .pf-hero-split .pf-hero-visual { max-width: 260px; margin: 0 auto; aspect-ratio: 1/1; }
}
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 5: Verificación manual**

Run: `npm run dev`, abrir `/editor/<id>`.
Expected:
- Modo Móvil (pantalla simulada angosta, ~296px): `.pf-hero-name` se ve notablemente más chico que en Escritorio, proporcional al ancho angosto — no con el tamaño que tendría en una ventana completa.
- Si hay una sección Hero con variante "split" activa: `.pf-hero-split .pf-hero-visual` se reacomoda (max-width 260px, cuadrado) dentro del ancho angosto de la pantalla simulada móvil.
- Modo Escritorio (pantalla simulada ~840px): el contenido se ve proporcionalmente correcto para ese ancho.
- En `/p/<slug>` (portfolio publicado real, ventana de navegador normal): sin cambios visuales respecto a antes de este cambio, en ningún ancho de ventana — redimensionar por encima y por debajo de 640px para confirmar que el comportamiento responsive sigue igual.

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: make portfolio content respond to its container instead of the viewport"
```

---

## Self-Review Notes

- **Cobertura del spec:** Sección "Diseño" (`container-type` en `.pf-scope`, 3 `clamp()` vw→cqw, split del `@media`/`@container`) → Task 1, Steps 1-3. Verificación (editor Móvil/Escritorio, portfolio publicado sin cambios) → Task 1, Step 5.
- **Placeholders:** ninguno — el CSS de cada step está completo, con el valor numérico exacto de cada regla existente (no inventado).
- **Consistencia:** ningún selector nuevo se introduce — todas las reglas modificadas ya existen en el archivo con el mismo nombre de clase, solo cambia la unidad de medida (`vw`→`cqw`) o el tipo de at-rule (`@media`→`@container`) que las envuelve. La regla `.adm-main` del `@media (max-width: 640px)` original permanece intacta y en el mismo tipo de at-rule, ya que no es parte del sistema `.pf-*` y no depende del contenedor del portfolio.
