# Pantalla simulada del preview: alto fijo a la columna, scroll interno Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En ≥900px, hacer que la pantalla simulada del preview (`.adm-device-frame`/`.adm-preview-frame`) llene el alto disponible de la columna de preview sin exceder la ventana del usuario, con el scroll del contenido ocurriendo dentro de la pantalla simulada en vez de en la columna completa.

**Architecture:** Cambio puramente CSS en `src/styles/global.css`, dentro de las reglas ya existentes `.adm-studio-preview` y su `@media (max-width: 900px)`. Se encadena `flex: 1; min-height: 0` desde `.adm-studio-preview` hasta `.adm-preview-frame` (pasando por `.adm-preview-wrap` y `.adm-device-frame`) para que el alto se reparta hacia abajo y el último eslabón (`.adm-preview-frame`) sea quien scrollee. Bajo 900px se neutraliza la cadena para preservar el flujo de documento normal ya existente.

**Tech Stack:** CSS plano, sin JS ni cambios de componentes.

## Global Constraints

- No hay framework de testing en el proyecto. Verificación: `npm run build` pasando + revisión manual con `npm run dev`.
- No se agregan dependencias nuevas ni tokens CSS nuevos.
- No se toca `PreviewTab.jsx` ni ningún otro componente — solo `src/styles/global.css`.
- No se cambia el comportamiento bajo 900px (layout apilado ya establecido) más allá de mantenerlo intacto.
- El chrome de dispositivo (`.adm-browser-chrome`/`.adm-phone-notch`) y su ocultamiento bajo 900px, de la feature anterior, no se modifican.

---

## Task 1: Encadenar `flex: 1; min-height: 0` desde `.adm-studio-preview` hasta `.adm-preview-frame`

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: ningún selector nuevo — modifica las reglas existentes `.adm-studio-preview`, `.adm-studio-preview .adm-preview-frame`, y agrega overrides dentro del `@media (max-width: 900px)` ya existente para `.adm-studio-body`.

- [ ] **Step 1: Modificar `.adm-studio-preview` para que sea un contenedor flex-column sin scroll propio**

Localizar con `grep -n "adm-studio-preview {" src/styles/global.css` (la línea puede haber cambiado desde el último cambio). Reemplazar:

```css
.adm-studio-preview {
  flex: 1; min-width: 0; overflow-y: auto; background: var(--a-bg); padding: 28px 24px;
}
```

por:

```css
.adm-studio-preview {
  flex: 1; min-width: 0; overflow: hidden; background: var(--a-bg); padding: 28px 24px;
  display: flex; flex-direction: column;
}
```

- [ ] **Step 2: Encadenar `flex: 1; min-height: 0` por los hijos hasta `.adm-preview-frame`**

Localizar con `grep -n "adm-studio-preview .adm-preview-frame" src/styles/global.css`. Reemplazar:

```css
.adm-studio-preview .adm-preview-frame { max-height: none; overflow-y: visible; }
```

por:

```css
.adm-studio-preview .adm-preview-wrap { flex: 1; min-height: 0; width: 100%; }
.adm-studio-preview .adm-device-frame { flex: 1; min-height: 0; }
.adm-studio-preview .adm-preview-frame { max-height: none; flex: 1; min-height: 0; overflow-y: auto; }
```

(`.adm-preview-wrap` ya tiene `display: flex; flex-direction: column; align-items: center; gap: 16px;` en su regla base — sin cambios ahí, solo se le agrega `flex:1; min-height:0; width:100%` en este contexto específico via el nuevo selector `.adm-studio-preview .adm-preview-wrap`. `.adm-device-frame` ya tiene `display: flex; flex-direction: column` en su regla base — sin cambios ahí tampoco, solo se le agrega el `flex:1; min-height:0` scoped.)

- [ ] **Step 3: Neutralizar la cadena bajo 900px**

Localizar el bloque `@media (max-width: 900px)` que contiene `.adm-studio-body { display: block; min-height: auto; }` (buscar con `grep -n "adm-studio-body { display: block" src/styles/global.css`). Agregar, dentro de ese mismo bloque de media query (no crear uno nuevo):

```css
  .adm-studio-preview { display: block; overflow: visible; }
  .adm-studio-preview .adm-preview-wrap { flex: none; }
  .adm-studio-preview .adm-device-frame { flex: none; }
  .adm-studio-preview .adm-preview-frame { flex: none; max-height: none; overflow-y: visible; }
```

El bloque completo debe quedar (ejemplo, respetando lo que ya exista antes de estas líneas):

```css
@media (max-width: 900px) {
  .adm-studio-body { display: block; min-height: auto; }
  .adm-studio-sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--a-border); overflow-y: visible; }
  .adm-studio-preview { display: block; overflow: visible; }
  .adm-studio-preview .adm-preview-wrap { flex: none; }
  .adm-studio-preview .adm-device-frame { flex: none; }
  .adm-studio-preview .adm-preview-frame { flex: none; max-height: none; overflow-y: visible; }
}
```

(Si en el archivo actual ya existe una línea `.adm-studio-preview { overflow-y: visible; }` dentro de este bloque de una etapa anterior, reemplazarla por la nueva `.adm-studio-preview { display: block; overflow: visible; }` en vez de duplicarla.)

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 5: Verificación manual**

Run: `npm run dev`, abrir `/editor/<id>`.
Expected:
- En ≥900px: la pantalla simulada (ventana de navegador en Escritorio, bisel en Móvil) se estira para ocupar todo el alto disponible de la columna derecha, sin sobrepasar el borde inferior de la ventana del navegador y sin que aparezca scroll en la página ni en la columna completa.
- Si el contenido del portfolio es más alto que la pantalla simulada, aparece scroll dentro de esa pantalla (dentro del borde redondeado), no en la columna que la contiene.
- Cambiar Escritorio ↔ Móvil: ambas pantallas se estiran igual, sin residuos de la otra.
- Redimensionar bajo 900px: el comportamiento es idéntico al que había antes de este cambio (scroll de página normal, sin pantalla simulada visible ya que el chrome se oculta en ese rango).

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: fill preview column height with simulated screen, scroll inside it"
```

---

## Self-Review Notes

- **Cobertura del spec:** Sección "Diseño" (cadena flex de `.adm-studio-preview` a `.adm-preview-frame`, neutralización bajo 900px) → Task 1, Steps 1-3. Verificación → Task 1, Steps 4-5.
- **Placeholders:** ninguno — el CSS de cada step está completo.
- **Consistencia:** los selectores modificados (`.adm-studio-preview`, `.adm-studio-preview .adm-preview-wrap`, `.adm-studio-preview .adm-device-frame`, `.adm-studio-preview .adm-preview-frame`) existen o se derivan directamente de clases ya presentes en el archivo (`.adm-preview-wrap`, `.adm-device-frame`, `.adm-preview-frame` de la feature de chrome anterior) — ningún nombre nuevo, ninguna clase inventada sin uso en el JSX existente.
