# Almacenamiento de imágenes (upload a Supabase Storage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir subir imágenes reales (foto de perfil del Hero, portada de cada proyecto) a Supabase Storage desde el editor, manteniendo también la opción de pegar una URL externa.

**Architecture:** Bucket público `portfolio-images` en Supabase Storage con políticas RLS por carpeta de usuario. Un módulo `src/lib/imageUpload.js` encapsula subida/borrado. Un componente compartido `ImageUploadField.jsx` da la UI (miniatura, botón de subida, toggle a URL, botón quitar) y se integra en `HeroForm.jsx` y `ProjectsForm.jsx` (que gana un campo `imageUrl` nuevo). `ProjectsGrid.jsx`/`ProjectsList.jsx` renderizan la imagen de portada en la página pública si existe.

**Tech Stack:** React (componentes existentes), `@supabase/supabase-js` (ya en el proyecto, `supabase.storage`), CSS plano en `src/styles/global.css`.

## Global Constraints

- Bucket de Storage: `portfolio-images`, público, límite 5MB por archivo, tipos permitidos `image/jpeg`, `image/png`, `image/webp`.
- Rutas de archivo: `{user_id}/{uuid}.{ext}` — un nivel de carpeta por usuario.
- No hay framework de testing en el proyecto. Verificación: `npm run build` pasando + revisión manual con `npm run dev` en el navegador.
- No se tocan otras secciones del portafolio (About, Skills, Experience, Contact) — solo Hero y Proyectos.
- No se agrega recorte/edición de imagen en cliente (crop, resize) — solo validación de tipo/tamaño antes de subir.
- El campo de URL externa se mantiene como alternativa a la subida (no se elimina), según lo acordado en el spec.
- Borrado de la imagen anterior al reemplazar/quitar es best-effort (fire-and-forget, errores silenciosos) — nunca bloquea el guardado del portafolio.

---

## Task 1: Bucket de Storage y políticas RLS

**Files:**
- Ninguno en el repo — cambio de infraestructura en el proyecto Supabase `dzannfaklwjhmkoauokq` (`portfolio-builder`), vía migración SQL aplicada con la herramienta MCP de Supabase.

**Interfaces:**
- Produces: bucket `portfolio-images` (público, `file_size_limit` 5MB, `allowed_mime_types` jpeg/png/webp) con 4 políticas RLS sobre `storage.objects` que las Tasks 2+ asumen que existen.

- [ ] **Step 1: Aplicar la migración que crea el bucket y las políticas**

Usar la tool MCP `apply_migration` (servidor Supabase) con `project_id: "dzannfaklwjhmkoauokq"`, `name: "portfolio_images_bucket"` y esta query:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-images', 'portfolio-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "portfolio-images public read"
on storage.objects for select
using (bucket_id = 'portfolio-images');

create policy "portfolio-images owner insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'portfolio-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "portfolio-images owner update"
on storage.objects for update
to authenticated
using (bucket_id = 'portfolio-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "portfolio-images owner delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'portfolio-images' and auth.uid()::text = (storage.foldername(name))[1]);
```

Expected: la migración se aplica sin errores.

- [ ] **Step 2: Verificar que el bucket y las políticas existen**

Usar la tool MCP `execute_sql` con `project_id: "dzannfaklwjhmkoauokq"` y la query:

```sql
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'portfolio-images';
```

Expected: una fila con `public = true`, `file_size_limit = 5242880`, `allowed_mime_types = {image/jpeg,image/png,image/webp}`.

Luego:

```sql
select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'portfolio-images%';
```

Expected: 4 filas (`select`, `insert`, `update`, `delete`).

- [ ] **Step 3: Commit**

No hay archivos de repo que commitear en esta tarea (cambio de infraestructura, no de código). Continuar directamente a la Task 2.

---

## Task 2: Módulo `src/lib/imageUpload.js`

**Files:**
- Create: `src/lib/imageUpload.js`

**Interfaces:**
- Consumes: `supabase` desde `src/lib/supabaseClient.js` (ya existe, exporta `supabase`).
- Produces:
  - `uploadPortfolioImage(file: File, userId: string): Promise<string>` — sube el archivo, devuelve la URL pública, o lanza `Error` con mensaje en español si falla la validación o la subida.
  - `deletePortfolioImage(url: string): void` — fire-and-forget, no devuelve promesa que haya que esperar, no lanza errores.

- [ ] **Step 1: Crear el archivo con la lógica de subida y borrado**

```js
import { supabase } from './supabaseClient.js';

const BUCKET = 'portfolio-images';
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function uploadPortfolioImage(file, userId) {
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    throw new Error('Formato no soportado. Usa JPG, PNG o WebP.');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('La imagen supera el límite de 5MB.');
  }

  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) {
    throw new Error('No se pudo subir la imagen. Intenta de nuevo.');
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function deletePortfolioImage(url) {
  const path = extractStoragePath(url);
  if (!path) return;
  supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}

function extractStoragePath(url) {
  if (typeof url !== 'string') return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores (el módulo no se usa todavía en ningún componente, pero debe compilar/lintear sin problemas de sintaxis).

- [ ] **Step 3: Commit**

```bash
git add src/lib/imageUpload.js
git commit -m "feat: add Supabase Storage upload/delete helpers for portfolio images"
```

---

## Task 3: Componente `ImageUploadField`

**Files:**
- Create: `src/components/admin/ImageUploadField.jsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `useAuth` desde `src/context/AuthContext.jsx` (expone `user.id`); `uploadPortfolioImage`, `deletePortfolioImage` desde `src/lib/imageUpload.js` (Task 2).
- Produces: componente `ImageUploadField` con props `{ value: string, onChange: (url: string) => void, label: string, hint?: string }`, usado por Tasks 4 y 5.

- [ ] **Step 1: Crear el componente**

```jsx
import { useRef, useState } from 'react';
import { ImagePlus, Link2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { uploadPortfolioImage, deletePortfolioImage } from '../../lib/imageUpload.js';

export default function ImageUploadField({ value, onChange, label, hint }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const previousUrl = value;
      const newUrl = await uploadPortfolioImage(file, user.id);
      onChange(newUrl);
      if (previousUrl) deletePortfolioImage(previousUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    if (value) deletePortfolioImage(value);
    onChange('');
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
          placeholder="https://..."
        />
      )}
      {error && <span className="adm-image-upload-error">{error}</span>}
      {hint && <span className="adm-field-hint">{hint}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Agregar estilos en `src/styles/global.css`**

Localizar con `grep -n "adm-add-btn:hover" src/styles/global.css` (queda inmediatamente antes del bloque `.adm-range`). Insertar después de esa línea (`.adm-add-btn:hover { border-color: var(--a-accent); color: var(--a-accent); }`):

```css
.adm-image-upload { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.adm-image-upload-preview {
  width: 56px; height: 56px; border-radius: 8px; border: 1px solid var(--a-border);
  background: var(--a-bg); display: flex; align-items: center; justify-content: center;
  color: var(--a-muted); overflow: hidden; flex-shrink: 0;
}
.adm-image-upload-preview img { width: 100%; height: 100%; object-fit: cover; }
.adm-image-upload-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.adm-image-upload-btn {
  background: transparent; border: 1px solid var(--a-border); color: var(--a-text); padding: 7px 12px;
  border-radius: 7px; font-size: 12.5px; cursor: pointer; font-family: var(--font-body);
}
.adm-image-upload-btn:hover:not(:disabled) { border-color: var(--a-accent); color: var(--a-accent); }
.adm-image-upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.adm-image-upload-link-btn {
  background: none; border: none; color: var(--a-muted); font-size: 12px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px; text-decoration: underline; text-decoration-color: var(--a-border);
}
.adm-image-upload-link-btn:hover { color: var(--a-text); }
.adm-image-upload-remove {
  background: none; border: none; color: var(--a-muted); cursor: pointer; padding: 4px; border-radius: 5px;
  display: inline-flex; align-items: center;
}
.adm-image-upload-remove:hover { color: #B84C3A; background: #F6E4DE; }
.adm-image-upload-error { font-size: 11.5px; color: #B84C3A; display: block; margin-top: 6px; }
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ImageUploadField.jsx src/styles/global.css
git commit -m "feat: add reusable ImageUploadField admin component"
```

---

## Task 4: Integrar en `HeroForm.jsx`

**Files:**
- Modify: `src/components/admin/forms/HeroForm.jsx`

**Interfaces:**
- Consumes: `ImageUploadField` (Task 3), prop contract `{ value, onChange, label, hint }`.

- [ ] **Step 1: Reemplazar el campo de texto de la foto por `ImageUploadField`**

El archivo completo queda:

```jsx
import Field from '../Field.jsx';
import AutoTextarea from '../AutoTextarea.jsx';
import ImageUploadField from '../ImageUploadField.jsx';

export default function HeroForm({ content, onChange }) {
  const set = (k, v) => onChange({ ...content, [k]: v });
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
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 3: Verificación manual en el navegador**

Run: `npm run dev`, abrir `/editor/<id>` → pestaña Secciones → Hero.

Expected:
- El campo "Foto (URL)" ahora se ve como "Foto" con una miniatura vacía, botón "Subir imagen" y enlace "o pegar una URL".
- Subir un archivo JPG/PNG/WebP menor a 5MB: el botón dice "Subiendo…", luego la miniatura muestra la imagen y el indicador de guardado del editor pasa a "Guardando…/Guardado hace Xm".
- Recargar la página: la foto persiste (confirma que `photoUrl` se guardó en Supabase y la imagen sigue accesible públicamente).
- Intentar subir un PDF o una imagen mayor a 5MB: aparece el mensaje de error inline, la miniatura no cambia.
- Click en "o pegar una URL", pegar una URL externa (ej. de Unsplash): la miniatura se actualiza sin pasar por Storage.
- Click en el ícono de basura: la miniatura vuelve a vacía y el hero público (pestaña Vista previa) vuelve a mostrar las iniciales.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/forms/HeroForm.jsx
git commit -m "feat: use ImageUploadField for hero photo"
```

---

## Task 5: Campo `imageUrl` en `ProjectsForm.jsx`

**Files:**
- Modify: `src/components/admin/forms/ProjectsForm.jsx`

**Interfaces:**
- Consumes: `ImageUploadField` (Task 3).
- Produces: cada item de `content.items` gana la propiedad `imageUrl: string` (nueva), que las Task 6 lee para renderizar en la página pública.

- [ ] **Step 1: Agregar `imageUrl` a los nuevos proyectos y el campo de imagen al formulario**

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
          <ImageUploadField label="Imagen de portada" value={it.imageUrl || ''} onChange={(v) => updateItem(it.id, { imageUrl: v })} />
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

(`it.imageUrl || ''` cubre proyectos creados antes de este cambio, que no tienen la propiedad.)

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 3: Verificación manual en el navegador**

Run: `npm run dev`, abrir `/editor/<id>` → pestaña Secciones → Proyectos.

Expected:
- Cada proyecto (nuevo o existente) muestra el campo "Imagen de portada" arriba de "Título".
- Un proyecto creado antes de este cambio (sin `imageUrl`) muestra el campo vacío sin errores en consola.
- Agregar un proyecto nuevo, subirle una imagen de portada: funciona igual que en el Hero (subida, error de validación, URL externa, quitar).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/forms/ProjectsForm.jsx
git commit -m "feat: add cover image field to project items"
```

---

## Task 6: Mostrar la imagen de portada en la página pública

**Files:**
- Modify: `src/components/public/ProjectsGrid.jsx`
- Modify: `src/components/public/ProjectsList.jsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `content.items[].imageUrl` (producido por Task 5).

- [ ] **Step 1: Renderizar la imagen en `ProjectsGrid.jsx`**

Archivo completo:

```jsx
export default function ProjectsGrid({ content }) {
  return (
    <section className="pf-section pf-projects">
      <p className="pf-eyebrow">// proyectos</p>
      <h2 className="pf-projects-heading">Proyectos</h2>
      <div className="pf-projects-grid">
        {content.items.map((p) => (
          <article key={p.id} className="pf-project-card">
            {p.imageUrl && <img src={p.imageUrl} alt={p.title || 'Proyecto'} className="pf-project-image" />}
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
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Renderizar la imagen en `ProjectsList.jsx`**

Archivo completo:

```jsx
export default function ProjectsList({ content }) {
  return (
    <section className="pf-section pf-projects">
      <p className="pf-eyebrow">// proyectos</p>
      <h2 className="pf-projects-heading">Proyectos</h2>
      <div className="pf-projects-list">
        {content.items.map((p, i) => (
          <div key={p.id} className="pf-project-row">
            <span className="pf-project-index">{String(i + 1).padStart(2, '0')}</span>
            <div>
              {p.imageUrl && <img src={p.imageUrl} alt={p.title || 'Proyecto'} className="pf-project-image" />}
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
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Agregar estilos de la imagen de portada**

Localizar con `grep -n "pf-project-link {" src/styles/global.css` (línea justo antes de `.pf-projects-list`). Insertar después de esa línea:

```css
.pf-project-image { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px; }
.pf-project-row .pf-project-image { max-width: 220px; margin-bottom: 6px; }
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 5: Verificación manual en el navegador**

Run: `npm run dev`.

- En `/editor/<id>` → pestaña Vista previa (o Diseño → variante Proyectos "Grid" y "Lista"): el proyecto con imagen de portada la muestra arriba del título, con proporción 16:9 y bordes redondeados; los proyectos sin imagen se ven exactamente igual que antes (sin hueco vacío).
- Publicar el portafolio (o usar uno ya publicado) y abrir `/p/<slug>` en una ventana privada/incógnito (sin sesión iniciada): la imagen de portada del proyecto y la foto del hero se cargan correctamente — confirma que la política `SELECT` pública del bucket funciona sin autenticación.

- [ ] **Step 6: Commit**

```bash
git add src/components/public/ProjectsGrid.jsx src/components/public/ProjectsList.jsx src/styles/global.css
git commit -m "feat: render project cover image on public portfolio page"
```

---

## Self-Review Notes

- **Cobertura del spec:**
  - "Supabase Storage" (bucket, límites, rutas, RLS) → Task 1.
  - "`src/lib/imageUpload.js`" (`uploadPortfolioImage`, `deletePortfolioImage`) → Task 2.
  - "`src/components/admin/ImageUploadField.jsx`" (miniatura, subida, toggle URL, quitar, estados de error/uploading) → Task 3.
  - "Integración" en `HeroForm.jsx` → Task 4; en `ProjectsForm.jsx` (incluye `addItem` con `imageUrl`) → Task 5; en `ProjectsGrid.jsx`/`ProjectsList.jsx` + CSS → Task 6.
  - "Manejo de errores" (tamaño/tipo, fallo de red, borrado best-effort) → cubierto en Task 2 (validación y try/catch) y Task 3 (estado `error`, `deletePortfolioImage` sin `await`).
  - "Testing / verificación" del spec → pasos de verificación manual en Tasks 4, 5 y 6; verificación de bucket/políticas en Task 1.
- **Placeholders:** ninguno — todo el código de cada step está completo y es el contenido final del archivo (o un fragmento con contexto exacto de dónde insertarlo vía `grep -n`).
- **Consistencia de tipos/nombres:**
  - `uploadPortfolioImage(file, userId): Promise<string>` y `deletePortfolioImage(url): void` (Task 2) se usan con esa misma firma en `ImageUploadField.jsx` (Task 3).
  - Prop contract de `ImageUploadField` (`value, onChange, label, hint`) es igual en Task 4 (`HeroForm`) y Task 5 (`ProjectsForm`).
  - `content.items[].imageUrl` introducido en Task 5 es el mismo nombre leído en Task 6 (`p.imageUrl`).
  - Clase CSS `pf-project-image` definida en Task 6 es la misma usada en ambos componentes (`ProjectsGrid.jsx`, `ProjectsList.jsx`).
