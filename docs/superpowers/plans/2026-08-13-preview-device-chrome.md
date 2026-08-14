# Chrome de dispositivo en el preview del editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Envolver el preview del editor (`PreviewTab.jsx`) en un chrome decorativo que varía según el modo: ventana de navegador (puntos de semáforo + barra de URL falsa) en Escritorio, bisel de teléfono con notch en Móvil — oculto en pantallas angostas (<900px).

**Architecture:** Un solo componente (`PreviewTab.jsx`) gana un wrapper condicional (`.adm-device-frame`) alrededor del `.adm-preview-frame` existente, sin tocar su comportamiento interno ni añadir props. Todo el trabajo visual vive en CSS nuevo en `global.css`, reutilizando tokens existentes donde aplica y literales fijos solo para los colores de los puntos de semáforo (patrón visual externo reconocible, no parte de la paleta de la app).

**Tech Stack:** React 18 (JSX condicional simple), CSS plano con el sistema de tokens `--a-*` existente.

## Global Constraints

- No hay framework de testing en el proyecto. Verificación: `npm run build` pasando + revisión manual con `npm run dev`.
- No se agregan dependencias nuevas.
- No se agregan props nuevas a `PreviewTab` — sigue recibiendo exactamente `{ sections, theme, viewport, onViewportChange }`.
- No se toca `EditorPage.jsx` ni `PortfolioRenderer.jsx`.
- El chrome de dispositivo (browser chrome o bisel) es puramente decorativo — sin interactividad (los puntos y la pastilla de URL no son clickeables).
- El texto de la pastilla de URL es fijo: `"portfolio.studio"` — no depende del slug real del portfolio.
- El chrome se oculta completamente por debajo de 900px (mismo breakpoint que ya usa `@media (max-width: 900px)` en `global.css` para el layout apilado).
- Reutilizar tokens CSS existentes (`--a-border`, `--a-bg`, `--a-panel-2`, `--a-muted`, `--a-shadow-md`, `--font-mono`) donde no se trate de los colores fijos de los puntos de semáforo.

---

## Task 1: Chrome de dispositivo en `PreviewTab`

**Files:**
- Modify: `src/components/admin/PreviewTab.jsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: `PreviewTab` sigue exportando el mismo componente con la misma firma de props — ningún consumidor externo cambia.
- Consumes: nada nuevo — sigue usando `PortfolioRenderer` (`../public/PortfolioRenderer.jsx`) sin cambios.

- [ ] **Step 1: Envolver `.adm-preview-frame` en `.adm-device-frame` con el chrome condicional**

En `src/components/admin/PreviewTab.jsx`, reemplazar:

```jsx
      <div className={`adm-preview-frame ${viewport === 'mobile' ? 'is-mobile' : ''}`}>
        <PortfolioRenderer sections={sections} theme={theme} />
      </div>
```

por:

```jsx
      <div className={`adm-device-frame ${viewport === 'mobile' ? 'is-mobile' : 'is-desktop'}`}>
        {viewport === 'desktop' && (
          <div className="adm-browser-chrome">
            <span className="adm-browser-dot adm-browser-dot-red" />
            <span className="adm-browser-dot adm-browser-dot-yellow" />
            <span className="adm-browser-dot adm-browser-dot-green" />
            <span className="adm-browser-url">portfolio.studio</span>
          </div>
        )}
        {viewport === 'mobile' && <div className="adm-phone-notch" />}
        <div className={`adm-preview-frame ${viewport === 'mobile' ? 'is-mobile' : ''}`}>
          <PortfolioRenderer sections={sections} theme={theme} />
        </div>
      </div>
```

El resto del archivo (el `<div className="adm-preview-wrap">` exterior y el toolbar con el `adm-segmented`) no cambia.

- [ ] **Step 2: Agregar los estilos del chrome de dispositivo**

En `src/styles/global.css`, localizar la regla `.adm-preview-frame.is-mobile { max-width: 380px; }` con `grep -n "adm-preview-frame.is-mobile" src/styles/global.css` (puede no estar en la misma línea que en revisiones anteriores del archivo) y agregar inmediatamente después:

```css

.adm-device-frame { display: flex; flex-direction: column; width: 100%; max-width: 900px; }
.adm-device-frame.is-mobile { max-width: 380px; }

.adm-browser-chrome {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  background: var(--a-panel-2); border: 1px solid var(--a-border); border-bottom: none;
  border-radius: 14px 14px 0 0;
}
.adm-browser-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.adm-browser-dot-red { background: #ED6A5E; }
.adm-browser-dot-yellow { background: #F4BF4F; }
.adm-browser-dot-green { background: #61C454; }
.adm-browser-url {
  margin: 0 auto; padding: 4px 14px; background: var(--a-bg); border-radius: 6px;
  color: var(--a-muted); font-family: var(--font-mono); font-size: 11.5px;
}
.adm-device-frame.is-desktop .adm-preview-frame { border-radius: 0 0 14px 14px; }

.adm-device-frame.is-mobile {
  border: 10px solid var(--a-panel-2); border-radius: 36px; padding-top: 22px;
  background: var(--a-panel-2); align-items: center;
}
.adm-phone-notch {
  width: 120px; height: 22px; border-radius: 0 0 14px 14px; background: var(--a-panel-2);
  margin: 0 auto -22px; position: relative; z-index: 1;
}
.adm-device-frame.is-mobile .adm-preview-frame { width: 100%; border-radius: 26px; }

@media (max-width: 900px) {
  .adm-browser-chrome, .adm-phone-notch { display: none; }
  .adm-device-frame.is-mobile { border: none; padding-top: 0; background: none; }
  .adm-device-frame.is-desktop .adm-preview-frame,
  .adm-device-frame.is-mobile .adm-preview-frame { border-radius: 14px; }
}
```

(`.adm-preview-frame.is-mobile { max-width: 380px; }`, la regla original, queda intacta — el `max-width` en modo móvil ahora lo controla `.adm-device-frame.is-mobile`, pero la regla vieja no molesta porque el frame interno ya no necesita limitar su propio ancho, hereda el 100% del wrapper.)

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificación manual**

Run: `npm run dev`, abrir `/editor/<id>`.
Expected:
- En modo Escritorio (ventana >900px), el preview se ve dentro de una ventana de navegador: barra superior con 3 puntos de colores (rojo/amarillo/verde) y una pastilla centrada con el texto "portfolio.studio".
- Cambiar a Móvil: el preview se ve dentro de un bisel con bordes gruesos redondeados y un notch centrado arriba, sin barra de navegador.
- Volver a Escritorio: el chrome cambia de vuelta limpiamente, sin restos del bisel.
- Redimensionar la ventana bajo 900px: el chrome de dispositivo desaparece por completo en ambos modos (ni barra de navegador ni bisel/notch), el preview se ve como una caja simple con bordes redondeados uniformes.
- El contenido del portfolio (`PortfolioRenderer`) se sigue viendo y actualizando en vivo igual que antes — el chrome es puramente decorativo alrededor.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/PreviewTab.jsx src/styles/global.css
git commit -m "feat: add browser/phone device chrome around editor preview"
```

---

## Self-Review Notes

- **Cobertura del spec:** Sección "1. PreviewTab.jsx" → Task 1 Step 1. Sección "2. CSS" → Task 1 Step 2 (incluye `.adm-device-frame`, `.adm-browser-chrome`, `.adm-browser-dot`, `.adm-phone-bezel`/notch, y el ocultamiento bajo 900px). Sección "3. Colores de los puntos" → literales hex documentados inline en el CSS del Step 2. Verificación → Task 1 Steps 3-4.
- **Placeholders:** ninguno — todo el código de cada step está completo.
- **Consistencia de nombres:** `PreviewTab` no gana ni pierde props (`sections`, `theme`, `viewport`, `onViewportChange`, sin cambios respecto al código actual). Las clases CSS referenciadas en el JSX de Step 1 (`adm-device-frame`, `is-mobile`, `is-desktop`, `adm-browser-chrome`, `adm-browser-dot`/`-red`/`-yellow`/`-green`, `adm-browser-url`, `adm-phone-notch`) coinciden exactamente con las definidas en el CSS de Step 2.
