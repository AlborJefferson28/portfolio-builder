# Editor de encuadre (posición + zoom) para imágenes subidas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar, dentro de `ImageUploadField`, un editor de encuadre (arrastrar para reposicionar + slider de zoom) para la foto del Hero y la portada de cada proyecto, guardando el ajuste como metadata (posición + zoom) sin recortar el archivo original, y reflejándolo en la vista previa y en la página pública.

**Architecture:** `ImageUploadField.jsx` gana un panel expandible con un marco de arrastre (pointer events) y un slider de zoom, con props nuevas opcionales (`position`, `zoom`, `onPositionChange`, `onZoomChange`, `frameShape`). `HeroForm.jsx`/`ProjectsForm.jsx` pasan esos props leyendo/escribiendo campos nuevos en `content`/`item` (`photoPosition`/`photoZoom`, `imagePosition`/`imageZoom`). Los 4 componentes públicos que renderizan estas imágenes envuelven el `<img>` en un contenedor recortado (`overflow:hidden`) y aplican `objectPosition`/`transform:scale` inline según esos valores, con defaults (`{x:50,y:50}`, `1`) que reproducen el comportamiento visual actual.

**Tech Stack:** React (Pointer Events API para el arrastre), CSS plano en `src/styles/global.css`. Sin librerías nuevas.

## Global Constraints

- No se recorta ni se re-sube ningún archivo — el ajuste es solo metadata (`position`/`zoom`) aplicada con CSS.
- Defaults: `position = { x: 50, y: 50 }`, `zoom = 1`. Con estos valores el render debe ser visualmente idéntico al comportamiento actual (sin este cambio). Portafolios/proyectos existentes (sin estos campos) deben verse exactamente igual que antes.
- El marco del editor usa la forma real donde se mostrará la imagen: círculo para Hero variante "Centrado", rectángulo `4:5` para Hero variante "Dividido" (editorial dividido), `16:9` para portadas de proyecto (ambas variantes de Proyectos usan esa proporción).
- No hay framework de testing en el proyecto. Verificación: `npm run build` pasando + revisión manual con `npm run dev`.
- No se agrega historial/deshacer más allá de un botón "Restablecer" que vuelve a `{x:50,y:50}`/`zoom:1`.
- El zoom tiene rango `1`–`3` (slider `step="0.05"`).

---

## Task 1: Panel de editor de encuadre en `ImageUploadField.jsx`

**Files:**
- Modify: `src/components/admin/ImageUploadField.jsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: `ImageUploadField` gana props opcionales `position: {x,y}|undefined`, `zoom: number|undefined`, `onPositionChange: (pos) => void`, `onZoomChange: (zoom) => void`, `frameShape: 'circle' | '4:5' | '16:9'` (default `'circle'`). El botón "Editar encuadre" y el panel solo se renderizan cuando `value` no está vacío **y** tanto `onPositionChange` como `onZoomChange` fueron provistos (así el componente sigue funcionando sin romper en cualquier lugar donde todavía no se hayan conectado esos props — relevante hasta que las Tasks 2 y 3 los conecten).
- Este componente no se conecta a ningún formulario todavía en esta tarea — se verifica solo con build (no hay forma de ejercitarlo desde el navegador hasta la Task 2).

- [ ] **Step 1: Reemplazar el contenido completo de `ImageUploadField.jsx`**

```jsx
import { useRef, useState } from 'react';
import { ImagePlus, Link2, Trash2, Crop } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { uploadPortfolioImage } from '../../lib/imageUpload.js';

const DEFAULT_POSITION = { x: 50, y: 50 };
const DEFAULT_ZOOM = 1;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

const FRAME_SHAPE_CLASS = {
  circle: 'adm-frame-editor-circle',
  '4:5': 'adm-frame-editor-4-5',
  '16:9': 'adm-frame-editor-16-9',
};

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
  const [editingFrame, setEditingFrame] = useState(false);
  const fileInputRef = useRef(null);
  const frameRef = useRef(null);
  const dragRef = useRef(null);

  const pos = position || DEFAULT_POSITION;
  const z = zoom || DEFAULT_ZOOM;
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
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setEditingFrame(false);
  };

  const handlePointerDown = (e) => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPos: pos,
      width: frame.offsetWidth,
      height: frame.offsetHeight,
    };
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const { startX, startY, startPos, width, height } = dragRef.current;
    const dxPct = ((e.clientX - startX) / width) * 100;
    const dyPct = ((e.clientY - startY) / height) * 100;
    onPositionChange({
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
    onPositionChange(DEFAULT_POSITION);
    onZoomChange(DEFAULT_ZOOM);
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
          {value && canEditFrame && (
            <button type="button" className="adm-image-upload-link-btn" onClick={() => setEditingFrame((s) => !s)}>
              <Crop size={12} /> Editar encuadre
            </button>
          )}
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
          placeholder="https://..."
        />
      )}
      {editingFrame && value && canEditFrame && (
        <div className="adm-frame-editor">
          <div
            ref={frameRef}
            className={`adm-frame-editor-frame ${FRAME_SHAPE_CLASS[frameShape] || FRAME_SHAPE_CLASS.circle}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <img
              src={value}
              alt=""
              style={{ objectPosition: `${pos.x}% ${pos.y}%`, transform: `scale(${z})` }}
              draggable={false}
            />
          </div>
          <div className="adm-frame-editor-controls">
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              className="adm-range"
              value={z}
              onChange={(e) => onZoomChange(Number(e.target.value))}
            />
            <button type="button" className="adm-image-upload-link-btn" onClick={handleReset}>Restablecer</button>
            <button type="button" className="adm-image-upload-btn" onClick={() => setEditingFrame(false)}>Listo</button>
          </div>
        </div>
      )}
      {error && <span className="adm-image-upload-error">{error}</span>}
      {hint && <span className="adm-field-hint">{hint}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Agregar estilos del editor de encuadre**

Localizar con `grep -n "adm-image-upload-error" src/styles/global.css`. Insertar después de esa línea (`.adm-image-upload-error { font-size: 11.5px; color: #B84C3A; display: block; margin-top: 6px; }`):

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

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ImageUploadField.jsx src/styles/global.css
git commit -m "feat: add drag-to-reposition and zoom frame editor to ImageUploadField"
```

---

## Task 2: Conectar el editor en el Hero (`ContentForm.jsx` + `HeroForm.jsx`)

**Files:**
- Modify: `src/components/admin/ContentForm.jsx`
- Modify: `src/components/admin/forms/HeroForm.jsx`

**Interfaces:**
- Consumes: `ImageUploadField` props `position`, `zoom`, `onPositionChange`, `onZoomChange`, `frameShape` (Task 1).
- Produces: `content.photoPosition: {x,y}` y `content.photoZoom: number` — nuevos campos en la sección Hero, que la Task 4 lee en el render público.

- [ ] **Step 1: Pasar `variant` de la sección a `HeroForm` en `ContentForm.jsx`**

El archivo completo queda:

```jsx
import HeroForm from './forms/HeroForm.jsx';
import AboutForm from './forms/AboutForm.jsx';
import ProjectsForm from './forms/ProjectsForm.jsx';
import SkillsForm from './forms/SkillsForm.jsx';
import ExperienceForm from './forms/ExperienceForm.jsx';
import ContactForm from './forms/ContactForm.jsx';

export default function ContentForm({ section, onChange }) {
  switch (section.type) {
    case 'hero': return <HeroForm content={section.content} variant={section.variant} onChange={onChange} />;
    case 'about': return <AboutForm content={section.content} onChange={onChange} />;
    case 'projects': return <ProjectsForm content={section.content} onChange={onChange} />;
    case 'skills': return <SkillsForm content={section.content} onChange={onChange} />;
    case 'experience': return <ExperienceForm content={section.content} onChange={onChange} />;
    case 'contact': return <ContactForm content={section.content} onChange={onChange} />;
    default: return null;
  }
}
```

- [ ] **Step 2: Conectar `position`/`zoom`/`frameShape` en `HeroForm.jsx`**

El archivo completo queda:

```jsx
import Field from '../Field.jsx';
import AutoTextarea from '../AutoTextarea.jsx';
import ImageUploadField from '../ImageUploadField.jsx';

export default function HeroForm({ content, variant, onChange }) {
  const set = (k, v) => onChange({ ...content, [k]: v });
  const frameShape = variant === 'split' ? '4:5' : 'circle';
  return (
    <div className="adm-form-grid">
      <Field label="Nombre"><input className="adm-input" value={content.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Rol"><input className="adm-input" value={content.role} onChange={(e) => set('role', e.target.value)} /></Field>
      <Field label="Tagline" hint="Una frase corta debajo de tu nombre">
        <AutoTextarea className="adm-textarea" rows={2} value={content.tagline} onChange={(e) => set('tagline', e.target.value)} />
      </Field>
      <ImageUploadField
        label="Foto"
        hint="Sube una imagen o pega una URL. Si lo dejas vacío, se muestran tus iniciales."
        value={content.photoUrl}
        onChange={(v) => set('photoUrl', v)}
        position={content.photoPosition}
        zoom={content.photoZoom}
        onPositionChange={(p) => set('photoPosition', p)}
        onZoomChange={(z) => set('photoZoom', z)}
        frameShape={frameShape}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificación manual en el navegador**

Run: `npm run dev`, abrir `/editor/<id>` → Secciones → Hero (con una foto ya subida, o subir una).

Expected:
- Aparece el botón "Editar encuadre" junto a "Subir imagen"/"o pegar una URL".
- Al hacer click, se despliega un panel con un marco **circular** (variante Hero "Centrado" activa) mostrando la imagen.
- Arrastrar dentro del marco mueve la parte visible de la imagen en la dirección esperada (arrastrar hacia la derecha revela más del lado derecho de la imagen — si el movimiento se siente invertido, en `handlePointerMove` de `ImageUploadField.jsx` cambiar `startPos.x - dxPct` por `startPos.x + dxPct` y `startPos.y - dyPct` por `startPos.y + dyPct`, y volver a verificar).
- Mover el slider de zoom acerca la imagen dentro del marco, sin desbordarse fuera del círculo.
- "Restablecer" vuelve el marco a centrado/sin zoom.
- Cambiar la variante del Hero a "Editorial dividido" (pestaña Diseño) y volver a Secciones → Hero → Editar encuadre: el marco ahora es un rectángulo vertical (proporción 4:5), no un círculo.
- El indicador de guardado pasa a "Guardando…/Guardado hace Xm" al ajustar el encuadre (autosave existente, sin cambios).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ContentForm.jsx src/components/admin/forms/HeroForm.jsx
git commit -m "feat: wire frame editor into hero photo field"
```

---

## Task 3: Conectar el editor en Proyectos (`ProjectsForm.jsx`)

**Files:**
- Modify: `src/components/admin/forms/ProjectsForm.jsx`

**Interfaces:**
- Consumes: `ImageUploadField` props de la Task 1.
- Produces: `item.imagePosition: {x,y}` e `item.imageZoom: number` por proyecto — nuevos campos que la Task 5 lee en el render público.

- [ ] **Step 1: Conectar `position`/`zoom`/`frameShape` en cada `ImageUploadField` de proyecto**

El archivo completo queda:

```jsx
import { Plus, Trash2 } from 'lucide-react';
import Field from '../Field.jsx';
import AutoTextarea from '../AutoTextarea.jsx';
import ImageUploadField from '../ImageUploadField.jsx';
import { uid } from '../../../utils/uid.js';

export default function ProjectsForm({ content, onChange }) {
  const items = content.items;
  const updateItem = (id, patch) => onChange({ ...content, items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const addItem = () => onChange({ ...content, items: [...items, { id: uid(), title: '', description: '', stack: '', url: '', imageUrl: '' }] });
  const removeItem = (id) => onChange({ ...content, items: items.filter((it) => it.id !== id) });
  return (
    <div className="adm-list-editor">
      {items.map((it) => (
        <div key={it.id} className="adm-list-item">
          <button type="button" className="adm-remove-btn" onClick={() => removeItem(it.id)} aria-label="Eliminar proyecto"><Trash2 size={14} /></button>
          <ImageUploadField
            label="Imagen de portada"
            value={it.imageUrl || ''}
            onChange={(v) => updateItem(it.id, { imageUrl: v })}
            position={it.imagePosition}
            zoom={it.imageZoom}
            onPositionChange={(p) => updateItem(it.id, { imagePosition: p })}
            onZoomChange={(z) => updateItem(it.id, { imageZoom: z })}
            frameShape="16:9"
          />
          <Field label="Título"><input className="adm-input" value={it.title} onChange={(e) => updateItem(it.id, { title: e.target.value })} /></Field>
          <Field label="Descripción"><AutoTextarea className="adm-textarea" rows={2} value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} /></Field>
          <Field label="Stack" hint="Separado por comas"><input className="adm-input" value={it.stack} onChange={(e) => updateItem(it.id, { stack: e.target.value })} /></Field>
          <Field label="Link" hint="Opcional"><input className="adm-input" value={it.url} onChange={(e) => updateItem(it.id, { url: e.target.value })} placeholder="https://..." /></Field>
        </div>
      ))}
      <button type="button" className="adm-add-btn" onClick={addItem}><Plus size={14} /> Agregar proyecto</button>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 3: Verificación manual en el navegador**

Run: `npm run dev`, abrir `/editor/<id>` → Secciones → Proyectos, en un proyecto con imagen de portada.

Expected:
- "Editar encuadre" abre un panel con marco **rectangular 16:9** (más ancho que alto), no circular.
- Arrastrar y zoom funcionan igual que en el Hero.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/forms/ProjectsForm.jsx
git commit -m "feat: wire frame editor into project cover image field"
```

---

## Task 4: Aplicar el encuadre en el Hero público (`HeroCentered.jsx` + `HeroSplit.jsx`)

**Files:**
- Modify: `src/components/public/HeroCentered.jsx`
- Modify: `src/components/public/HeroSplit.jsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `content.photoPosition`, `content.photoZoom` (Task 2).

- [ ] **Step 1: Envolver la foto en un frame recortado en `HeroCentered.jsx`**

Archivo completo:

```jsx
import { initials } from '../../utils/initials.js';

export default function HeroCentered({ content }) {
  const pos = content.photoPosition || { x: 50, y: 50 };
  const zoom = content.photoZoom || 1;
  return (
    <section className="pf-section pf-hero pf-hero-centered">
      <p className="pf-eyebrow">// hola, soy</p>
      {content.photoUrl ? (
        <div className="pf-hero-photo-frame">
          <img
            src={content.photoUrl}
            alt={content.name}
            className="pf-hero-photo"
            style={{ objectPosition: `${pos.x}% ${pos.y}%`, transform: `scale(${zoom})` }}
          />
        </div>
      ) : (
        <div className="pf-hero-avatar" aria-hidden="true">{initials(content.name)}</div>
      )}
      <h1 className="pf-hero-name">{content.name || 'Tu nombre'}</h1>
      <p className="pf-hero-role">{content.role || 'Tu rol'}</p>
      {content.tagline && <p className="pf-hero-tagline">{content.tagline}</p>}
    </section>
  );
}
```

- [ ] **Step 2: Aplicar el estilo al `<img>` en `HeroSplit.jsx`**

Archivo completo:

```jsx
import { initials } from '../../utils/initials.js';

export default function HeroSplit({ content }) {
  const pos = content.photoPosition || { x: 50, y: 50 };
  const zoom = content.photoZoom || 1;
  return (
    <section className="pf-section pf-hero pf-hero-split">
      <div>
        <p className="pf-eyebrow">// hola, soy</p>
        <h1 className="pf-hero-name">{content.name || 'Tu nombre'}</h1>
        <p className="pf-hero-role">{content.role || 'Tu rol'}</p>
        {content.tagline && <p className="pf-hero-tagline">{content.tagline}</p>}
      </div>
      <div className="pf-hero-visual">
        {content.photoUrl ? (
          <img
            src={content.photoUrl}
            alt={content.name}
            style={{ objectPosition: `${pos.x}% ${pos.y}%`, transform: `scale(${zoom})` }}
          />
        ) : initials(content.name)}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Ajustar CSS — separar el tamaño/forma del `<img>` hacia el nuevo `.pf-hero-photo-frame`**

Localizar con `grep -n "pf-hero-centered .pf-hero-avatar" src/styles/global.css`. Reemplazar:

```css
.pf-hero-centered .pf-hero-avatar, .pf-hero-centered .pf-hero-photo {
  width: 84px; height: 84px; border-radius: 50%; margin: 0 auto 22px; object-fit: cover;
  display: flex; align-items: center; justify-content: center; background: var(--p-accent-soft);
  color: var(--p-accent); font-family: var(--font-display); font-size: 26px; border: 1px solid var(--p-border);
}
```

por:

```css
.pf-hero-centered .pf-hero-avatar, .pf-hero-centered .pf-hero-photo-frame {
  width: 84px; height: 84px; border-radius: 50%; margin: 0 auto 22px;
  border: 1px solid var(--p-border); overflow: hidden;
}
.pf-hero-centered .pf-hero-avatar {
  display: flex; align-items: center; justify-content: center; background: var(--p-accent-soft);
  color: var(--p-accent); font-family: var(--font-display); font-size: 26px;
}
.pf-hero-photo-frame .pf-hero-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
```

(`.pf-hero-split .pf-hero-visual`/`.pf-hero-split .pf-hero-visual img` no cambian — ya son un contenedor recortado con `overflow: hidden` y el `<img>` interno ya usa `width:100%; height:100%; object-fit:cover`, per el CSS existente.)

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 5: Verificación manual en el navegador**

Run: `npm run dev`.

- En `/editor/<id>` → pestaña Vista previa, variante Hero "Centrado": la foto sigue viéndose como círculo del mismo tamaño que antes (si no se tocó el editor de encuadre, `photoPosition`/`photoZoom` están `undefined` → default centrado/1x → visualmente igual que antes de este cambio).
- Ajustar el encuadre en Secciones → Hero → Editar encuadre: la Vista previa refleja el mismo recorte/zoom elegido.
- Cambiar a variante "Editorial dividido": la foto grande (proporción 4:5) también refleja el encuadre elegido.
- Publicar (o usar un portfolio ya publicado) y ver `/p/<slug>`: mismo resultado que en la Vista previa, sin sesión iniciada.
- Un portfolio existente sin `photoPosition`/`photoZoom` (creado antes de esta feature) se ve exactamente igual que antes.

- [ ] **Step 6: Commit**

```bash
git add src/components/public/HeroCentered.jsx src/components/public/HeroSplit.jsx src/styles/global.css
git commit -m "feat: render hero photo with saved crop position and zoom"
```

---

## Task 5: Aplicar el encuadre en las portadas de proyecto públicas (`ProjectsGrid.jsx` + `ProjectsList.jsx`)

**Files:**
- Modify: `src/components/public/ProjectsGrid.jsx`
- Modify: `src/components/public/ProjectsList.jsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `item.imagePosition`, `item.imageZoom` (Task 3).

- [ ] **Step 1: Envolver la imagen en un frame recortado en `ProjectsGrid.jsx`**

Archivo completo:

```jsx
export default function ProjectsGrid({ content }) {
  return (
    <section className="pf-section pf-projects">
      <p className="pf-eyebrow">// proyectos</p>
      <h2 className="pf-projects-heading">Proyectos</h2>
      <div className="pf-projects-grid">
        {content.items.map((p) => {
          const pos = p.imagePosition || { x: 50, y: 50 };
          const zoom = p.imageZoom || 1;
          return (
            <article key={p.id} className="pf-project-card">
              {p.imageUrl && (
                <div className="pf-project-image-frame">
                  <img
                    src={p.imageUrl}
                    alt={p.title || 'Proyecto'}
                    className="pf-project-image"
                    style={{ objectPosition: `${pos.x}% ${pos.y}%`, transform: `scale(${zoom})` }}
                  />
                </div>
              )}
              <h3 className="pf-project-title">{p.title || 'Proyecto'}</h3>
              {p.description && <p className="pf-project-desc">{p.description}</p>}
              {p.stack && (
                <div className="pf-project-stack">
                  {p.stack.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                    <span key={i} className="pf-tag">{s}</span>
                  ))}
                </div>
              )}
              {p.url && <a className="pf-project-link" href={p.url} target="_blank" rel="noreferrer">Ver proyecto →</a>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Envolver la imagen en un frame recortado en `ProjectsList.jsx`**

Archivo completo:

```jsx
export default function ProjectsList({ content }) {
  return (
    <section className="pf-section pf-projects">
      <p className="pf-eyebrow">// proyectos</p>
      <h2 className="pf-projects-heading">Proyectos</h2>
      <div className="pf-projects-list">
        {content.items.map((p, i) => {
          const pos = p.imagePosition || { x: 50, y: 50 };
          const zoom = p.imageZoom || 1;
          return (
            <div key={p.id} className="pf-project-row">
              <span className="pf-project-index">{String(i + 1).padStart(2, '0')}</span>
              <div>
                {p.imageUrl && (
                  <div className="pf-project-image-frame">
                    <img
                      src={p.imageUrl}
                      alt={p.title || 'Proyecto'}
                      className="pf-project-image"
                      style={{ objectPosition: `${pos.x}% ${pos.y}%`, transform: `scale(${zoom})` }}
                    />
                  </div>
                )}
                <h3 className="pf-project-title">{p.title || 'Proyecto'}</h3>
                {p.description && <p className="pf-project-desc">{p.description}</p>}
                {p.stack && (
                  <div className="pf-project-stack">
                    {p.stack.split(',').map((s) => s.trim()).filter(Boolean).map((s, i2) => (
                      <span key={i2} className="pf-tag">{s}</span>
                    ))}
                  </div>
                )}
                {p.url && <a className="pf-project-link" href={p.url} target="_blank" rel="noreferrer">Ver proyecto →</a>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Ajustar CSS — separar el tamaño/forma hacia el nuevo `.pf-project-image-frame`**

Localizar con `grep -n "pf-project-image {" src/styles/global.css`. Reemplazar:

```css
.pf-project-image { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px; }
.pf-project-row .pf-project-image { max-width: 220px; margin-bottom: 6px; }
```

por:

```css
.pf-project-image-frame { width: 100%; aspect-ratio: 16/9; border-radius: 8px; overflow: hidden; }
.pf-project-image-frame .pf-project-image { width: 100%; height: 100%; object-fit: cover; display: block; }
.pf-project-row .pf-project-image-frame { max-width: 220px; margin-bottom: 6px; }
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 5: Verificación manual en el navegador**

Run: `npm run dev`.

- En `/editor/<id>` → Vista previa, variante Proyectos "Grid": una portada de proyecto sin ajustar se ve exactamente igual que antes (16:9, recortada centrada).
- Ajustar el encuadre de esa portada en Secciones → Proyectos → Editar encuadre: la Vista previa refleja el recorte/zoom elegido.
- Cambiar a variante "Lista numerada": la misma portada (ahora más chica, `max-width: 220px`) también refleja el encuadre elegido.
- Publicar y ver `/p/<slug>` sin sesión iniciada: mismo resultado.
- Un proyecto existente sin `imagePosition`/`imageZoom` se ve exactamente igual que antes.

- [ ] **Step 6: Commit**

```bash
git add src/components/public/ProjectsGrid.jsx src/components/public/ProjectsList.jsx src/styles/global.css
git commit -m "feat: render project cover image with saved crop position and zoom"
```

---

## Self-Review Notes

- **Cobertura del spec:**
  - "Modelo de datos" (`photoPosition`/`photoZoom`, `imagePosition`/`imageZoom`, retrocompatible) → Task 2 (Hero) y Task 3 (Proyectos) introducen los campos; Tasks 4/5 los leen con defaults.
  - "`ImageUploadField.jsx`" (panel, marco por forma, arrastre, slider, restablecer, listo) → Task 1.
  - "Integración en formularios" (variant→frameShape en Hero, 16:9 fijo en Proyectos) → Tasks 2 y 3.
  - "Renderizado público" (frames recortados, estilo inline, defaults = comportamiento actual) → Tasks 4 y 5.
  - "Testing / verificación" del spec → pasos de verificación manual en cada task, incluyendo el caso de portafolios/proyectos existentes sin los campos nuevos.
- **Placeholders:** ninguno — todo el código de cada step es el contenido final del archivo o un fragmento con ubicación exacta vía `grep -n`.
- **Consistencia de tipos/nombres:**
  - Props de `ImageUploadField` (`position`, `zoom`, `onPositionChange`, `onZoomChange`, `frameShape`) definidas en Task 1 se usan con los mismos nombres en Task 2 (`HeroForm`) y Task 3 (`ProjectsForm`).
  - `content.photoPosition`/`content.photoZoom` (Task 2) son los mismos nombres leídos en Task 4 (`HeroCentered`, `HeroSplit`).
  - `item.imagePosition`/`item.imageZoom` (Task 3) son los mismos nombres leídos en Task 5 (`ProjectsGrid`, `ProjectsList`).
  - Clases CSS nuevas (`pf-hero-photo-frame`, `pf-project-image-frame`, `adm-frame-editor*`) se definen una sola vez y se usan de forma consistente en los componentes que las referencian.
  - Default `{x:50,y:50}`/`1` es idéntico en los 4 puntos de lectura (Task 1 dentro del editor, Task 4 y Task 5 en el render público).
