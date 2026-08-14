# Chrome de dispositivo en el preview del editor (navegador / bisel de teléfono)

## Contexto

Etapa 4 (final) hacia el mockup de referencia "Portfolio Studio". Las 3 etapas anteriores ya implementaron el layout de sidebar+preview persistente (`docs/superpowers/plans/2026-08-13-editor-studio-layout.md`). Hoy `PreviewTab.jsx` renderiza el portfolio dentro de `.adm-preview-frame`, una caja simple con borde redondeado — sin diferenciación visual entre el modo "Escritorio" y "Móvil" más allá del `max-width`.

El pedido: que la vista previa se muestre dentro de una "pantalla" que varíe según el modo seleccionado — una ventana de navegador en Escritorio, un bisel de teléfono en Móvil — para que el preview se sienta como un dispositivo real, no una caja genérica.

## Alcance

- Modifica `src/components/admin/PreviewTab.jsx`: envuelve `.adm-preview-frame` en un nuevo wrapper `.adm-device-frame` con markup condicional según `viewport`.
- **Escritorio:** agrega `.adm-browser-chrome` arriba del frame — 3 puntos de semáforo (rojo/amarillo/verde, decorativos, sin funcionalidad) y una pastilla `.adm-browser-url` con el texto fijo `"portfolio.studio"` (no dinámico, no depende del slug real del portfolio).
- **Móvil:** agrega `.adm-phone-bezel` envolviendo el frame — bisel con bordes redondeados gruesos y un `.adm-phone-notch` (isla/notch decorativo) centrado arriba. Sin barra de navegador ni barra de estado.
- El chrome de dispositivo (browser chrome o bisel) se oculta completamente por debajo del breakpoint de 900px ya existente (el mismo que activa el layout apilado de `.adm-studio-body` en `global.css`) — en pantallas angostas el preview vuelve a verse "pelado", igual que hoy, sin bisel ni barra de navegador, para no desperdiciar espacio.
- **No** agrega props nuevas a `PreviewTab` ni toca `EditorPage.jsx` — el componente sigue recibiendo exactamente `{ sections, theme, viewport, onViewportChange }`.
- **No** toca `PortfolioRenderer.jsx` ni la lógica de secciones/tema — es puramente decorativo, alrededor del `.adm-preview-frame` existente.
- **No** hace el chrome interactivo (los puntos de semáforo y la pastilla de URL son estáticos, no clickeables).

## Diseño

### 1. `PreviewTab.jsx`

Estructura actual:
```jsx
<div className={`adm-preview-frame ${viewport === 'mobile' ? 'is-mobile' : ''}`}>
  <PortfolioRenderer sections={sections} theme={theme} />
</div>
```

Nueva estructura:
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

`.adm-device-frame` es el nuevo contenedor que agrupa el chrome decorativo (barra de navegador o notch) junto con el `.adm-preview-frame` existente, que no cambia de comportamiento interno.

### 2. CSS (`src/styles/global.css`)

Nuevas clases, después del bloque `.adm-preview-frame.is-mobile { max-width: 380px; }`:

- `.adm-device-frame`: wrapper simple (`display: flex; flex-direction: column; width: 100%;`), hereda el `max-width` del `.adm-preview-frame` interno.
- `.adm-browser-chrome`: barra horizontal (fondo `var(--a-panel-2)`, borde inferior `var(--a-border)`, radio superior a juego con `.adm-preview-frame`), con los 3 puntos alineados a la izquierda (`display:flex; gap`) y la pastilla de URL centrada (`background: var(--a-bg); border-radius; color: var(--a-muted); font-family: var(--font-mono)`).
- `.adm-browser-dot`: círculo pequeño (8px), color de fondo fijo por variante (`-red` `#ED6A5E`, `-yellow` `#F4BF4F`, `-green` `#61C454` — colores decorativos estándar de macOS, no tokens del sistema porque son un patrón reconocible fijo, no parte de la paleta de la app).
- Cuando hay `.adm-browser-chrome`, `.adm-preview-frame` pierde el radio superior (se lo queda el chrome) para que se vean como una sola pieza.
- `.adm-phone-bezel` — en la etapa de diseño se decidió que el bisel es simplemente el propio `.adm-device-frame.is-mobile`: borde grueso (`border: 10px solid var(--a-panel-2)`), radio grande (`border-radius: 36px`), y el `.adm-phone-notch` (barra redondeada oscura, `width: 120px; height: 22px; border-radius: 0 0 14px 14px;` centrada arriba, `background: var(--a-panel-2)`, superpuesta con `margin: 0 auto -22px` para que se "hunda" en el borde superior del bisel).
- Media query: agregar `.adm-browser-chrome, .adm-phone-notch, .adm-device-frame.is-mobile { display: none }`-equivalente dentro de `@media (max-width: 900px)` (reutilizando el bloque ya existente) — específicamente: ocultar `.adm-browser-chrome` y `.adm-phone-notch`, y quitar el borde/padding del bisel en `.adm-device-frame.is-mobile` para que el `.adm-preview-frame` quede igual que en escritorio sin chrome.

### 3. Colores de los puntos de semáforo

Se usan valores hex fijos (no tokens `--a-*`) porque son un patrón visual reconocible externo (los "traffic lights" de macOS/Chrome), no parte de la paleta de marca de la app — igual criterio que otros literales ya presentes en el archivo (ej. `#F4E3D8`/`#A8501F` para estados activos).

## Testing / verificación

- `npm run build` pasa sin errores.
- Abrir `/editor/<id>`, tab "Secciones" o "Diseño" en el sidebar (da igual, el preview es persistente): en modo Escritorio (>900px), el preview se ve dentro de una ventana de navegador con 3 puntos de color y una pastilla "portfolio.studio" arriba.
- Cambiar a "Móvil" en el toggle: el preview se ve dentro de un bisel con bordes gruesos y un notch centrado arriba, sin barra de navegador.
- Volver a "Escritorio": el chrome cambia de vuelta sin residuos del bisel móvil.
- Redimensionar bajo 900px: el chrome de dispositivo (browser chrome o bisel) desaparece completamente en ambos modos, el preview vuelve a verse como una caja simple.
- No hay tests automatizados en el proyecto; verificación puramente manual.
