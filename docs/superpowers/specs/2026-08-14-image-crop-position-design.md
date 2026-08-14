# Editor de encuadre (posición + zoom) para imágenes subidas

## Contexto

`ImageUploadField.jsx` (agregado en la feature de almacenamiento de imágenes) permite subir o pegar una URL para la foto del Hero (`content.photoUrl`) y la portada de cada proyecto (`item.imageUrl`). Hoy la imagen siempre se recorta centrada vía `object-fit: cover` — no hay forma de elegir qué parte de la imagen queda visible ni de acercar/alejar.

El pedido: agregar, dentro del mismo flujo de carga, un editor de encuadre que combine reposicionamiento (arrastrar) y zoom, sin recortar el archivo original — el ajuste se guarda como metadata (posición + zoom) y se aplica visualmente con CSS.

## Alcance

- Aplica a los dos campos de imagen existentes: foto de Hero y portada de cada proyecto.
- No se recorta ni se re-sube ningún archivo — el archivo original en Storage no cambia. El ajuste es puramente de presentación (CSS `transform`/posición sobre el `<img>` renderizado).
- No se agrega historial de ajustes ni deshacer más allá de un botón "Restablecer" (vuelve a centrado/1x).
- El editor de encuadre del Hero muestra la forma real de la variante activa (círculo para "Centrado", rectángulo 4:5 para "Dividido"). Los proyectos usan siempre 16:9 (única proporción usada en ambas variantes de Proyectos).
- Retrocompatible: portafolios existentes sin `photoPosition`/`photoZoom`/`imagePosition`/`imageZoom` usan los defaults (centrado, sin zoom) y se ven idénticos a como se ven hoy.

## Diseño

### Modelo de datos

- `content.photoPosition: { x: number, y: number }` (porcentajes 0–100, default `{ x: 50, y: 50 }`) y `content.photoZoom: number` (default `1`, rango `1`–`3`) — nuevos, junto a `content.photoUrl` en la sección Hero.
- `item.imagePosition` / `item.imageZoom` — mismos defaults, por cada item de `content.items` en la sección Proyectos.
- `src/data/initialData.js` no necesita cambios (los defaults se resuelven en el punto de lectura, no hace falta persistirlos hasta que el usuario ajuste algo).

### `ImageUploadField.jsx`

Nuevas props: `position` (objeto `{x,y}` o `undefined`), `zoom` (número o `undefined`), `onPositionChange(pos)`, `onZoomChange(zoom)`, `frameShape` (`'circle' | '4:5' | '16:9'`).

- Cuando `value` no está vacío, aparece un botón "Editar encuadre" (junto a los botones existentes) que expande/colapsa un panel debajo del campo (estado local `editingFrame`, `useState(false)`).
- El panel contiene:
  - Un marco con la forma de `frameShape` (círculo, o rectángulo con el `aspect-ratio` correspondiente), tamaño fijo (ej. 180px), mostrando la imagen actual con `object-fit: cover`, `object-position: {x}% {y}%` y `transform: scale({zoom})` aplicados en vivo.
  - Arrastrar (`pointerdown`/`pointermove`/`pointerup` sobre el marco) actualiza `position` en tiempo real: el delta de movimiento en píxeles se convierte a porcentaje relativo al tamaño del marco y se sustrae/suma a la posición actual (arrastrar hacia la derecha mueve la parte visible hacia la izquierda, como en un editor de recorte estándar), con `Math.min`/`Math.max` para mantener `x`/`y` dentro de `0`–`100`.
  - Un `<input type="range" min="1" max="3" step="0.05">` para `zoom`, llama a `onZoomChange` en `onChange`.
  - Botón "Restablecer": llama `onPositionChange({ x: 50, y: 50 })` y `onZoomChange(1)`.
  - Botón "Listo": solo colapsa el panel (`setEditingFrame(false)`) — los valores ya se aplicaron al vuelo vía los callbacks anteriores, no hay estado "sin guardar" pendiente.
- Si `position`/`zoom` no vienen (portafolio viejo), el componente usa los defaults (`{x:50,y:50}`, `1`) tanto para mostrar el marco como para inicializar los sliders.

### Integración en formularios

- `src/components/admin/ContentForm.jsx`: `case 'hero'` pasa `variant={section.variant}` a `HeroForm` (nueva prop).
- `HeroForm.jsx`: recibe `variant`, calcula `frameShape = variant === 'split' ? '4:5' : 'circle'`, y pasa a `ImageUploadField`: `position={content.photoPosition}`, `zoom={content.photoZoom}`, `onPositionChange={(p) => set('photoPosition', p)}`, `onZoomChange={(z) => set('photoZoom', z)}`, `frameShape={frameShape}`.
- `ProjectsForm.jsx`: pasa a cada `ImageUploadField`: `position={it.imagePosition}`, `zoom={it.imageZoom}`, `onPositionChange={(p) => updateItem(it.id, { imagePosition: p })}`, `onZoomChange={(z) => updateItem(it.id, { imageZoom: z })}`, `frameShape="16:9"`.

### Renderizado público

Se envuelve cada imagen en un contenedor de tamaño/forma fija con `overflow: hidden` (nuevo donde no existe todavía), y el `<img>` interno recibe estilo inline calculado a partir de `photoPosition`/`photoZoom` (o `imagePosition`/`imageZoom`), con defaults `{x:50,y:50}`/`1` si no están definidos:

```jsx
style={{
  objectPosition: `${(position && position.x) ?? 50}% ${(position && position.y) ?? 50}%`,
  transform: `scale(${zoom ?? 1})`,
}}
```

- `HeroCentered.jsx`: la foto pasa de `<img className="pf-hero-photo" />` suelta a `<div className="pf-hero-photo-frame"><img className="pf-hero-photo" .../></div>` — el `div` tiene el círculo/tamaño/`overflow:hidden` que hoy tiene el `<img>` directamente, y el `<img>` interno pasa a `width:100%; height:100%; object-fit:cover`.
- `HeroSplit.jsx`: `.pf-hero-visual` ya es un contenedor recortado (`overflow: hidden`, `aspect-ratio: 4/5`) — solo se le agrega el estilo inline al `<img>` interno existente, sin cambiar el markup del contenedor.
- `ProjectsGrid.jsx` / `ProjectsList.jsx`: la imagen pasa de `<img className="pf-project-image" />` suelta a `<div className="pf-project-image-frame"><img className="pf-project-image" .../></div>`, siguiendo el mismo patrón que el Hero centrado.

Con `position={x:50,y:50}` y `zoom=1` (o ausentes), `object-position: 50% 50%` y `transform: scale(1)` son el comportamiento actual exacto — cero diferencia visual para portafolios que no usan el editor.

### CSS (`src/styles/global.css`)

- Estilos del panel del editor de encuadre (marco circular/rectangular, cursor de arrastre, slider, botones) en la zona de `.adm-image-upload-*` ya existente.
- `.pf-hero-photo-frame` / `.pf-project-image-frame`: replican el tamaño/forma/`overflow:hidden` que hoy tienen `.pf-hero-photo` / `.pf-project-image` directamente; estos últimos pasan a `width:100%; height:100%; object-fit:cover` dentro del frame (sin `border-radius`/`aspect-ratio` propios, que ahora viven en el frame).

## Testing / verificación

- No hay tests automatizados; verificación manual.
- `npm run build` pasa sin errores.
- En `/editor/<id>` → Hero: subir una foto, abrir "Editar encuadre", arrastrar y confirmar que la vista previa (círculo) se mueve como se espera; mover el slider de zoom y confirmar el acercamiento; "Restablecer" vuelve a centrado/1x.
- Cambiar la variante del Hero a "Dividido": el marco del editor pasa a mostrar la proporción 4:5 en vez de círculo.
- Guardar, recargar `/editor/<id>`: el encuadre elegido persiste (confirma que se guardó en Supabase).
- Ver la Vista previa y la página pública publicada: el encuadre elegido se refleja igual que en el editor.
- Un portafolio/proyecto ya existente sin `photoPosition`/`imagePosition` sigue viéndose igual que antes de este cambio (sin saltos ni recortes distintos).
- Repetir el flujo para la portada de un proyecto (marco 16:9, ambas variantes Grid y Lista).
