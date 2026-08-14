# Almacenamiento de imágenes (upload a Supabase Storage)

## Contexto

Hoy las imágenes del portafolio se manejan solo como texto: `HeroForm.jsx` tiene un input de texto para `content.photoUrl` (la foto de perfil del hero), pegando una URL externa. La sección de proyectos (`ProjectsForm.jsx` / `content.items[].*`) no tiene ningún campo de imagen.

El proyecto Supabase (`dzannfaklwjhmkoauokq`, `portfolio-builder`) no tiene ningún bucket de Storage creado todavía (`storage.buckets` está vacío). El pedido es agregar almacenamiento real de imágenes: subir archivos desde el dispositivo del usuario, además de poder seguir pegando una URL externa si se prefiere.

## Alcance

- Foto de perfil del Hero (`content.photoUrl`, ya existe): se agrega la opción de subir un archivo, manteniendo la opción de pegar una URL externa.
- Imagen de portada por proyecto (`content.items[].imageUrl`, campo **nuevo**): mismo mecanismo de subida/URL.
- No se tocan otras secciones (About, Skills, Experience, Contact) — no se pidieron imágenes ahí.
- No se agrega recorte/edición de imagen (crop, resize en cliente) — solo validación de tamaño y tipo antes de subir.
- No se migra el histórico: portafolios existentes con `photoUrl` como URL externa siguen funcionando igual (el campo sigue siendo una URL, solo cambia cómo se puede rellenar).

## Diseño

### Supabase Storage

- Bucket nuevo: `portfolio-images`, público (lectura pública, sin necesidad de URLs firmadas, porque los portafolios publicados son páginas públicas).
- Límites del bucket: 5MB por archivo, tipos permitidos `image/jpeg`, `image/png`, `image/webp`.
- Convención de rutas: `{user_id}/{uuid}.{ext}` — un solo nivel de carpeta por usuario, sin importar si la imagen es del hero o de un proyecto.
- Políticas RLS sobre `storage.objects` (bucket `portfolio-images`):
  - `SELECT`: público (`true`), para que la página pública del portafolio pueda mostrar las imágenes sin sesión.
  - `INSERT`/`UPDATE`/`DELETE`: solo si `auth.uid()::text = (storage.foldername(name))[1]` — el usuario solo puede escribir/borrar dentro de su propia carpeta.

### `src/lib/imageUpload.js` (nuevo)

Helper con la lógica de Storage, sin UI:

- `uploadPortfolioImage(file, userId)`:
  - Valida tipo (`image/jpeg|png|webp`) y tamaño (≤ 5MB); si falla, lanza un `Error` con mensaje en español legible para mostrar inline.
  - Sube a `portfolio-images/{userId}/{crypto.randomUUID()}.{ext}` vía `supabase.storage.from('portfolio-images').upload(...)`.
  - Devuelve la URL pública (`getPublicUrl`).
- `deletePortfolioImage(url)`:
  - Si `url` no pertenece al bucket `portfolio-images` (por ejemplo, es una URL externa pegada por el usuario), no hace nada.
  - Si pertenece, extrae el path y llama a `supabase.storage.from('portfolio-images').remove([path])`. Es fire-and-forget (no bloquea el flujo de guardado); los errores se ignoran silenciosamente (best-effort, no crítico si un archivo huérfano queda en el bucket).

### `src/components/admin/ImageUploadField.jsx` (nuevo)

Componente reutilizable, mismo contrato que un input controlado: props `{ value, onChange, label, hint }`.

- Muestra una miniatura cuadrada de `value` si no está vacío (con `<img>`), o un placeholder con ícono si está vacío.
- Botón "Subir imagen" que abre un `<input type="file" accept="image/jpeg,image/png,image/webp" hidden>`. Al seleccionar archivo:
  1. Estado local `uploading = true`.
  2. Llama a `uploadPortfolioImage(file, user.id)` (usa `useAuth()` para el `user.id`).
  3. Si tiene éxito: guarda la URL anterior, llama `onChange(nuevaUrl)`, y dispara `deletePortfolioImage(urlAnterior)` en segundo plano si había una imagen previa.
  4. Si falla: muestra `error` inline (debajo del campo) con el mensaje del `Error`, no cambia `value`.
  5. `uploading = false` al terminar (éxito o error).
- Un enlace/botón secundario pequeño "o pegar una URL" que revela un `<input type="text">` para pegar una URL externa directamente (mismo `onChange`); estado simple `showUrlInput` que empieza en `false`.
- Botón "Quitar" (ícono `Trash2`, ya usado en el proyecto) visible cuando `value` no está vacío: `onChange('')` y, si la URL era nuestra, `deletePortfolioImage(value)` en segundo plano.
- Mientras `uploading` es `true`: deshabilita los botones y muestra texto "Subiendo…" (mismo patrón visual que el resto del admin, sin spinner nuevo — reutilizar estilos existentes de botones deshabilitados).

### Integración

- `HeroForm.jsx`: el `Field label="Foto (URL)"` con `<input>` de texto se reemplaza por `<ImageUploadField value={content.photoUrl} onChange={(v) => set('photoUrl', v)} label="Foto" hint="Sube una imagen o pega una URL. Si lo dejas vacío, se muestran tus iniciales." />`.
- `ProjectsForm.jsx`:
  - `addItem` agrega `imageUrl: ''` al objeto inicial de cada proyecto nuevo.
  - Cada `adm-list-item` gana un `<ImageUploadField value={it.imageUrl} onChange={(v) => updateItem(it.id, { imageUrl: v })} label="Imagen de portada" />` antes o después del campo Título (arriba, como primer campo, para que se vea como portada).
- `src/data/initialData.js`: no requiere cambios (los proyectos nuevos ya salen de `addItem`, no de `getInitialData`).
- `ProjectsGrid.jsx` / `ProjectsList.jsx`: si `p.imageUrl` existe, renderizan `<img src={p.imageUrl} alt={p.title || 'Proyecto'} className="pf-project-image" />` dentro de `.pf-project-card` / `.pf-project-row` (antes del título). Si no existe, el card se ve exactamente igual que hoy (sin hueco vacío).
- CSS nuevo en `src/styles/global.css`:
  - `.pf-project-image`: `width: 100%`, `aspect-ratio` fijo (ej. `16/9`), `object-fit: cover`, radio de borde consistente con el resto de las cards.
  - Estilos para `ImageUploadField` (miniatura, placeholder, botones) siguiendo la paleta de variables ya usadas en el admin (`--a-*`).

### Manejo de errores

- Archivo > 5MB o tipo no soportado: mensaje inline antes de intentar subir (validación en `uploadPortfolioImage`, sin llamar a Storage).
- Falla de red/permisos al subir: mensaje inline con el error de Supabase, `value` no cambia.
- Borrado de imagen anterior (al reemplazar o quitar) es best-effort: si falla, no se muestra error al usuario ni se bloquea el guardado del portafolio — es limpieza secundaria, no una operación crítica del flujo.

## Testing / verificación

- No hay tests automatizados en el proyecto; verificación manual.
- `npm run build` pasa sin errores.
- Crear el bucket `portfolio-images` y sus políticas RLS en Supabase (vía MCP/migration) antes de probar en el navegador.
- En `/editor/<id>` → Hero: subir una imagen JPG/PNG/WebP < 5MB, ver la miniatura actualizarse y el autosave disparar "Guardando…/Guardado hace Xm".
- Intentar subir un archivo > 5MB o de tipo no soportado (ej. PDF): ver el mensaje de error inline, sin que se suba nada.
- Reemplazar una imagen ya subida por otra: confirmar que la anterior desaparece del bucket (verificar en el dashboard de Supabase Storage o vía `list_tables`/consulta a `storage.objects`).
- Pegar una URL externa en vez de subir archivo: se guarda igual, sin llamar a Storage.
- Agregar un proyecto nuevo, subirle una imagen de portada, guardar y recargar `/editor/<id>`: la imagen persiste.
- Ver la página pública del portafolio (`PortfolioRenderer`): la imagen de portada de proyecto y la foto del hero se muestran correctamente sin sesión iniciada (confirma que la política `SELECT` pública funciona).
- Quitar una imagen (botón "Quitar"): el campo vuelve a vacío, el card de proyecto vuelve a verse sin imagen.
