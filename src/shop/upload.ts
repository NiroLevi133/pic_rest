'use client';

/** Photo preparation in the browser: decode, fix rotation, shrink to ≤1280px JPEG before upload. */
/** Plenty for the model (it works at 1024px) and keeps the request well under hosting body limits. */
const MAX_SIDE = 1280;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export class PhotoError extends Error {}

export async function preparePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) throw new PhotoError('זה לא קובץ תמונה');
  if (file.size > MAX_FILE_BYTES) throw new PhotoError('הקובץ גדול מדי (עד 25MB)');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new PhotoError('לא הצלחנו לפתוח את התמונה. נסו קובץ JPG או PNG');
  }
  if (Math.min(bitmap.width, bitmap.height) < 256) throw new PhotoError('התמונה קטנה מדי. נסו תמונה באיכות גבוהה יותר');

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new PhotoError('הדפדפן לא תומך בעיבוד תמונות');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

const HISTORY_KEY = 'kiri-creations-v1';

/** Remember the visitor's creations in this browser, so they can come back to them. */
export function rememberCreation(id: string, styleId: string) {
  try {
    const list = recentCreations().filter((c) => c.id !== id);
    list.unshift({ id, styleId, at: Date.now() });
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 20)));
  } catch { /* ignore */ }
}

export function recentCreations(): { id: string; styleId: string; at: number }[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((c) => c && typeof c.id === 'string' && typeof c.styleId === 'string') : [];
  } catch {
    return [];
  }
}
