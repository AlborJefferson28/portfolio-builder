import { supabase } from './supabaseClient.js';

const BUCKET = 'cvs';
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function uploadPortfolioCv(file, userId, portfolioId) {
  if (file.type !== 'application/pdf') {
    throw new Error('El CV debe ser un archivo PDF.');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('El CV supera el límite de 10MB.');
  }

  const path = `${userId}/${portfolioId}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) {
    throw new Error('No se pudo subir el CV. Intenta de nuevo.');
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // El path es fijo por portfolio (upsert sobrescribe) — se agrega un parámetro de
  // versión para evitar que el navegador/CDN sirva el PDF anterior en caché.
  return `${data.publicUrl}?v=${Date.now()}`;
}

export function deletePortfolioCv(userId, portfolioId) {
  const path = `${userId}/${portfolioId}.pdf`;
  supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}
