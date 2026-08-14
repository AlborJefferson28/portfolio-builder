# Editor de encuadre como modal (estilo "estudio de edición") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el panel inline "Editar encuadre" de `ImageUploadField` por un modal que se abre automáticamente apenas termina de cargarse una imagen (subida o URL pegada), con estado borrador propio para que "Cancelar" no aplique ningún cambio.

**Architecture:** Nuevo componente `ImageFrameModal.jsx` (mismo patrón visual que `PublishModal.jsx`: overlay + `.adm-modal`, animación de entrada, cierre con Escape/click-afuera) que absorbe toda la lógica de arrastre (Pointer Events) y zoom que hoy vive en `ImageUploadField.jsx`, con estado local de borrador (`position`/`zoom`) que solo se comunica al padre al presionar "Listo". `ImageUploadField.jsx` pierde el botón/panel inline y pasa a disparar el modal automáticamente tras una subida exitosa o al salir del campo de URL pegada.

**Tech Stack:** React (Pointer Events, ya usado), CSS plano en `src/styles/global.css`. Sin librerías nuevas.

## Global Constraints

- No hay botón para reabrir el modal sobre una imagen ya confirmada — reajustar el encuadre requiere volver a subir/pegar la imagen. Esto es intencional, no un olvido.
- "Cancelar" (botón, Escape, o click en el overlay) nunca borra la imagen ni aplica el borrador — la imagen queda con el encuadre que tenía antes de abrir el modal (centrado/1x si es una imagen recién cargada).
- El modelo de datos (`photoPosition`/`photoZoom`, `imagePosition`/`imageZoom`, mecanismo `translate+scale` vía `getImageFrameStyle` en `src/utils/imageFrameStyle.js`) no cambia.
- No hay framework de testing. Verificación: `npm run build` pasando + revisión manual con `npm run dev`.

---

## Task 1: Componente `ImageFrameModal.jsx` + estilos

**Files:**
- Create: `src/components/admin/ImageFrameModal.jsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: `ImageFrameModal` con props `{ value: string, frameShape: 'circle'|'4:5'|'16:9', initialPosition: {x,y}|undefined, initialZoom: number|undefined, onConfirm: (position, zoom) => void, onCancel: () => void }`. Consumido por la Task 2 — no se conecta a ningún formulario en esta tarea (verificación solo por build).
- Consumes: `getImageFrameStyle` de `src/utils/imageFrameStyle.js` (ya existe).

- [ ] **Step 1: Crear `ImageFrameModal.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react';
import { getImageFrameStyle } from '../../utils/imageFrameStyle.js';

const FRAME_SHAPE_CLASS = {
  circle: 'adm-frame-editor-circle',
  '4:5': 'adm-frame-editor-4-5',
  '16:9': 'adm-frame-editor-16-9',
};

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export default function ImageFrameModal({ value, frameShape, initialPosition, initialZoom, onConfirm, onCancel }) {
  const [position, setPosition] = useState(initialPosition || { x: 50, y: 50 });
  const [zoom, setZoom] = useState(initialZoom || 1);
  const [entered, setEntered] = useState(false);
  const frameRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const handlePointerDown = (e) => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPos: position,
      width: frame.offsetWidth,
      height: frame.offsetHeight,
    };
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const { startX, startY, startPos, width, height } = dragRef.current;
    const dxPct = ((e.clientX - startX) / width) * 100;
    const dyPct = ((e.clientY - startY) / height) * 100;
    setPosition({
      x: clamp(startPos.x - dxPct, 0, 100),
      y: clamp(startPos.y - dyPct, 0, 100),
    });
  };

  const handlePointerUp = (e) => {
    const frame = frameRef.current;
    if (frame && frame.hasPointerCapture(e.pointerId)) frame.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  const handleReset = () => {
    setPosition({ x: 50, y: 50 });
    setZoom(1);
  };

  return (
    <div className={`adm-modal-overlay${entered ? ' is-entered' : ''}`} onClick={onCancel}>
      <div className={`adm-modal adm-frame-modal${entered ? ' is-entered' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="adm-modal-title">Ajusta el encuadre</h2>
        <p className="adm-modal-desc">Arrastra la imagen para reposicionarla y usa el control para hacer zoom.</p>
        <div
          ref={frameRef}
          className={`adm-frame-editor-frame ${FRAME_SHAPE_CLASS[frameShape] || FRAME_SHAPE_CLASS.circle}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img src={value} alt="" style={getImageFrameStyle(position, zoom)} draggable={false} />
        </div>
        <div className="adm-frame-editor-controls">
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            className="adm-range"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <button type="button" className="adm-image-upload-link-btn" onClick={handleReset}>Restablecer</button>
        </div>
        <div className="adm-frame-modal-footer">
          <button type="button" className="adm-btn-ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="adm-btn-primary" onClick={() => onConfirm(position, zoom)}>Listo</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Agrandar los marcos y agregar estilos del modal en `src/styles/global.css`**

Localizar con `grep -n "adm-frame-editor" src/styles/global.css`. Reemplazar el bloque:

```css
.adm-frame-editor { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.adm-frame-editor-frame {
  position: relative; overflow: hidden; background: var(--a-bg); border: 1px solid var(--a-border);
  cursor: grab; touch-action: none;
}
.adm-frame-editor-frame:active { cursor: grabbing; }
.adm-frame-editor-frame img { width: 100%; height: 100%; object-fit: cover; display: block; user-select: none; }
.adm-frame-editor-circle { width: 180px; height: 180px; border-radius: 50%; }
.adm-frame-editor-4-5 { width: 144px; height: 180px; border-radius: 10px; }
.adm-frame-editor-16-9 { width: 240px; height: 135px; border-radius: 10px; }
.adm-frame-editor-controls { display: flex; align-items: center; gap: 10px; }
```

por (se quita `.adm-frame-editor`, ya no se usa — el panel inline desaparece; se agrandan los tres tamaños de marco; se agregan los estilos propios del modal):

```css
.adm-frame-editor-frame {
  position: relative; overflow: hidden; background: var(--a-bg); border: 1px solid var(--a-border);
  cursor: grab; touch-action: none;
}
.adm-frame-editor-frame:active { cursor: grabbing; }
.adm-frame-editor-frame img { width: 100%; height: 100%; object-fit: cover; display: block; user-select: none; }
.adm-frame-editor-circle { width: 260px; height: 260px; border-radius: 50%; }
.adm-frame-editor-4-5 { width: 208px; height: 260px; border-radius: 10px; }
.adm-frame-editor-16-9 { width: 320px; height: 180px; border-radius: 10px; }
.adm-frame-editor-controls { display: flex; align-items: center; gap: 10px; }
.adm-modal.adm-frame-modal { max-width: 420px; text-align: center; }
.adm-frame-modal .adm-modal-desc { text-align: center; }
.adm-frame-modal .adm-frame-editor-frame { margin: 0 auto; }
.adm-frame-modal .adm-frame-editor-controls { justify-content: center; margin-top: 14px; }
.adm-frame-modal-footer { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ImageFrameModal.jsx src/styles/global.css
git commit -m "feat: add ImageFrameModal, a studio-style crop/position editor modal"
```

---

## Task 2: Reemplazar el panel inline por el modal en `ImageUploadField.jsx`

**Files:**
- Modify: `src/components/admin/ImageUploadField.jsx`

**Interfaces:**
- Consumes: `ImageFrameModal` (Task 1), props `{ value, frameShape, initialPosition, initialZoom, onConfirm, onCancel }`.
- No cambia el contrato externo de `ImageUploadField` (`value, onChange, label, hint, position, zoom, onPositionChange, onZoomChange, frameShape`) — `HeroForm.jsx` y `ProjectsForm.jsx` no necesitan tocarse.

- [ ] **Step 1: Reemplazar el contenido completo de `ImageUploadField.jsx`**

```jsx
import { useRef, useState } from 'react';
import { ImagePlus, Link2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { uploadPortfolioImage } from '../../lib/imageUpload.js';
import ImageFrameModal from './ImageFrameModal.jsx';

export default function ImageUploadField({
  value,
  onChange,
  label,
  hint,
  position,
  zoom,
  onPositionChange,
  onZoomChange,
  frameShape = 'circle',
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [frameModalOpen, setFrameModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const canEditFrame = Boolean(onPositionChange && onZoomChange);

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!user) {
      setError('Tu sesión expiró. Vuelve a iniciar sesión.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const newUrl = await uploadPortfolioImage(file, user.id);
      onChange(newUrl);
      if (canEditFrame) setFrameModalOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  const handleUrlBlur = () => {
    if (canEditFrame && value && value.trim()) setFrameModalOpen(true);
  };

  return (
    <div className="adm-field">
      <span className="adm-field-label">{label}</span>
      <div className="adm-image-upload">
        <div className="adm-image-upload-preview">
          {value ? <img src={value} alt="" /> : <ImagePlus size={20} />}
        </div>
        <div className="adm-image-upload-actions">
          <button
            type="button"
            className="adm-image-upload-btn"
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
          >
            {uploading ? 'Subiendo…' : 'Subir imagen'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={handleFileChange}
          />
          <button type="button" className="adm-image-upload-link-btn" onClick={() => setShowUrlInput((s) => !s)}>
            <Link2 size={12} /> o pegar una URL
          </button>
          {value && (
            <button type="button" className="adm-image-upload-remove" onClick={handleRemove} aria-label="Quitar imagen">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {showUrlInput && (
        <input
          className="adm-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="https://..."
        />
      )}
      {error && <span className="adm-image-upload-error">{error}</span>}
      {hint && <span className="adm-field-hint">{hint}</span>}
      {frameModalOpen && canEditFrame && (
        <ImageFrameModal
          value={value}
          frameShape={frameShape}
          initialPosition={position}
          initialZoom={zoom}
          onConfirm={(p, z) => {
            onPositionChange(p);
            onZoomChange(z);
            setFrameModalOpen(false);
          }}
          onCancel={() => setFrameModalOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 3: Verificación manual en el navegador**

Run: `npm run dev`, abrir `/editor/<id>` → Secciones → Hero.

Expected:
- Ya no aparece ningún botón "Editar encuadre".
- Subir una foto: apenas termina de subir, se abre automáticamente el modal "Ajusta el encuadre" con el marco (forma según la variante activa del Hero) mostrando la imagen recién subida.
- Arrastrar dentro del marco y mover el slider de zoom: el marco refleja los cambios en vivo.
- Click en "Listo": el modal se cierra, la miniatura del campo y la Vista previa reflejan el encuadre elegido.
- Subir otra foto y esta vez presionar "Cancelar" (o Escape, o click fuera del modal): el modal se cierra, la foto queda cargada pero centrada/sin zoom (el ajuste que se estaba haciendo no se aplicó).
- Pegar una URL externa en el campo y hacer click fuera de ese input (blur): se abre el mismo modal.
- Repetir el flujo completo (subida, cancelar, URL) en la portada de un proyecto — el marco debe verse 16:9 en vez de círculo.
- Confirmar que "Quitar" (ícono de basura) sigue funcionando igual que antes (sin relación con el modal).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ImageUploadField.jsx
git commit -m "feat: open frame editor as an auto-opening modal instead of inline panel"
```

---

## Self-Review Notes

- **Cobertura del spec:** "Nuevo componente `ImageFrameModal.jsx`" (borrador local, mismo patrón que `PublishModal`, drag+zoom, Escape/click-afuera=cancelar) → Task 1. "`ImageUploadField.jsx`" (elimina panel/botón, dispara modal tras upload/blur de URL, contrato externo sin cambios) → Task 2. "CSS" (marcos agrandados, `.adm-frame-modal`, elimina `.adm-frame-editor`) → Task 1, Step 2. "Testing / verificación" del spec → Task 2, Step 3 (incluye el caso Cancelar explícitamente).
- **Placeholders:** ninguno — todo el código de cada step es el contenido final del archivo o un bloque de reemplazo CSS exacto con ubicación vía `grep -n`.
- **Consistencia de tipos/nombres:** `ImageFrameModal` props (`value, frameShape, initialPosition, initialZoom, onConfirm, onCancel`) definidas en Task 1 se usan con esos mismos nombres en Task 2. `getImageFrameStyle(position, zoom)` (ya existente) se llama con la misma firma que en los demás puntos de render. El contrato externo de `ImageUploadField` no cambia, por lo que `HeroForm.jsx`/`ProjectsForm.jsx`/`ContentForm.jsx` (de la feature anterior) no requieren ninguna modificación en este plan.
