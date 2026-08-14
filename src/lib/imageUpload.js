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
    throw new Error(`No se pudo subir la imagen: ${error.message}`);
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
