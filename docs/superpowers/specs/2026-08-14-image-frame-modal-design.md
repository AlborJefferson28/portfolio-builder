# Editor de encuadre como modal (estilo "estudio de edición")

## Contexto

La feature de encuadre (posición + zoom) para imágenes recién agregada (`docs/superpowers/specs/2026-08-14-image-crop-position-design.md`) implementó el editor como un panel expandible inline, detrás de un botón "Editar encuadre" que solo aparece cuando ya hay una imagen cargada.

El pedido: en vez de ese panel inline, mostrar un **modal** al estilo "estudio de edición" (similar al editor de foto de portada de Facebook), que se abra **automáticamente** apenas termina de cargarse la imagen (subida de archivo o URL pegada) — sin necesidad de un botón separado.

## Alcance

- Reemplaza el panel inline (`.adm-frame-editor`) y el botón "Editar encuadre" de `ImageUploadField.jsx` — se eliminan.
- Aplica a los dos usos existentes: foto de Hero y portada de proyecto (mismo componente compartido).
- El modal se abre automáticamente: (a) al terminar con éxito una subida de archivo, (b) al salir del campo de texto de URL pegada (`onBlur`), si el valor no quedó vacío.
- No hay botón para reabrir el modal más tarde sobre una imagen ya confirmada — para volver a ajustar el encuadre, hay que subir/pegar la imagen de nuevo. (Limitación conocida y aceptada explícitamente.)
- El modelo de datos (`photoPosition`/`photoZoom`, `imagePosition`/`imageZoom`, mecanismo `translate+scale` vía `getImageFrameStyle`) no cambia — solo cambia cómo se llega a editarlos.
- "Cancelar" descarta el ajuste (la imagen queda con encuadre centrado/1x por defecto, tal cual estaba antes de abrir el modal) — nunca borra la imagen subida.

## Diseño

### Nuevo componente `src/components/admin/ImageFrameModal.jsx`

Modal siguiendo el mismo patrón que `PublishModal.jsx` (reutiliza las clases `.adm-modal-overlay`/`.adm-modal`, animación de entrada vía `entered` + `requestAnimationFrame`, cierre con `Escape`, click en el overlay = cancelar, `role="dialog" aria-modal="true"`).

Props: `{ value, frameShape, initialPosition, initialZoom, onConfirm(position, zoom), onCancel() }`.

- Mantiene **estado borrador local** (`useState` inicializado desde `initialPosition`/`initialZoom`) para `position`/`zoom` — el arrastre y el slider de zoom modifican solo este borrador, no llaman a ningún callback del padre hasta que se confirma. Así "Cancelar" simplemente cierra sin aplicar nada.
- Contenido:
  - `<h2 className="adm-modal-title">Ajusta el encuadre</h2>` + una descripción corta.
  - El marco de arrastre (mismo mecanismo de Pointer Events ya implementado: `handlePointerDown`/`Move`/`Up`/`Cancel`, clases `adm-frame-editor-circle`/`-4-5`/`-16-9` según `frameShape`), pero más grande (260px en el eje principal, en vez de 180/144/240 actuales) para sentirse como un "estudio" de edición, no un mini-panel.
  - El slider de zoom (`<input type="range" min="1" max="3" step="0.05" className="adm-range">`), igual que antes.
  - Botón "Restablecer" (vuelve el borrador a `{x:50,y:50}`/`1`).
  - Footer con dos botones: "Cancelar" (`adm-btn-ghost`, llama `onCancel()`) y "Listo" (`adm-btn-primary`, llama `onConfirm(position, zoom)` con el borrador actual).
- `Escape` y click en el overlay disparan lo mismo que "Cancelar".

### `ImageUploadField.jsx`

- Se elimina: el botón "Editar encuadre", el bloque `{editingFrame && ...}` (panel inline), el estado `editingFrame`, y toda la lógica de arrastre que se movió al nuevo componente (`frameRef`, `dragRef`, `handlePointerDown/Move/Up`, `handleReset` — todo pasa a vivir dentro de `ImageFrameModal.jsx`).
- Nuevo estado: `frameModalOpen` (`useState(false)`).
- `handleFileChange`: tras `onChange(newUrl)` exitoso, si `canEditFrame` es verdadero, `setFrameModalOpen(true)`.
- El input de URL pegada gana `onBlur`: si `canEditFrame` y el valor (recortado) no está vacío, `setFrameModalOpen(true)`.
- Render: `{frameModalOpen && canEditFrame && (<ImageFrameModal value={value} frameShape={frameShape} initialPosition={pos} initialZoom={z} onConfirm={(p, zm) => { onPositionChange(p); onZoomChange(zm); setFrameModalOpen(false); }} onCancel={() => setFrameModalOpen(false)} />)}`.
- El resto del componente (subir imagen, pegar URL, quitar, miniatura, mensajes de error) no cambia.

### CSS (`src/styles/global.css`)

- Las clases `.adm-frame-editor-frame`, `.adm-frame-editor-circle`, `.adm-frame-editor-4-5`, `.adm-frame-editor-16-9` se mantienen (mismo mecanismo de marco), pero sus tamaños fijos se agrandan para el contexto de modal (ej. círculo 260×260, 4:5 → 208×260, 16:9 → 320×180).
- Se elimina `.adm-frame-editor { margin-top: 4px; }` (ya no aplica, el marco ahora vive dentro del modal, no debajo del campo) y `.adm-frame-editor-controls` se reutiliza para el layout de slider + Restablecer dentro del modal.
- Nueva clase `.adm-modal.adm-frame-modal` con `max-width` mayor que el modal default (ej. 420px en vez de 400px, ajustable si el marco de 260px no entra con el padding actual) y `text-align: center` para centrar el marco.

## Testing / verificación

- No hay tests automatizados; verificación manual.
- `npm run build` pasa sin errores.
- Subir una foto en el Hero: el modal se abre automáticamente apenas termina la subida, mostrando el marco con la forma correcta según la variante activa.
- Arrastrar y hacer zoom dentro del modal, luego "Listo": el modal se cierra y el ajuste se refleja en la miniatura y en la Vista previa.
- Repetir pero presionando "Cancelar" (o Escape, o click fuera del modal): el modal se cierra, la imagen sigue cargada pero con encuadre centrado/1x (el ajuste que se estaba haciendo no se aplica).
- Pegar una URL externa y salir del campo (click afuera / Tab): el modal se abre igual que con una subida.
- Repetir todo el flujo en un proyecto (portada 16:9).
- Confirmar que ya no aparece ningún botón "Editar encuadre" en ningún lado — el único camino para ajustar el encuadre es volver a subir/pegar la imagen.
