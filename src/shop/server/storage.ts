import sharp from 'sharp';
import { randomBytes } from 'crypto';

/**
 * Store images for the shop in Supabase Storage (under shop/…), or keep them as data URLs
 * when storage isn't configured (local development).
 */
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SHOP_STORAGE_BUCKET || process.env.SUPABASE_BUCKET || 'dish-images';

async function upload(buffer: Buffer, folder: string): Promise<string> {
  if (!SUPABASE_URL || !SERVICE_KEY) return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  // Random, unguessable names: customer photos are not listed anywhere.
  const path = `shop/${folder}/${Date.now()}-${randomBytes(12).toString('hex')}.jpg`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) throw new Error(`storage upload failed ${res.status}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export class InvalidImageError extends Error {}

/**
 * Validate and normalize an uploaded photo (any common format, EXIF rotation applied,
 * max 1536px, JPEG). Returns the JPEG as a data URL (sent to the model) and its stored URL.
 */
export async function storeUpload(dataUrl: string): Promise<{ dataUrl: string; url: string }> {
  const m = /^data:image\/(jpeg|jpg|png|webp|heic|heif);base64,(.+)$/i.exec(dataUrl);
  if (!m) throw new InvalidImageError('unsupported image');
  let jpeg: Buffer;
  try {
    const img = sharp(Buffer.from(m[2], 'base64'), { failOn: 'error' }).rotate();
    const meta = await img.metadata();
    if (!meta.width || !meta.height || meta.width < 256 || meta.height < 256) throw new InvalidImageError('too small');
    jpeg = await img.resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  } catch (e) {
    throw e instanceof InvalidImageError ? e : new InvalidImageError('unreadable image');
  }
  return { dataUrl: `data:image/jpeg;base64,${jpeg.toString('base64')}`, url: await upload(jpeg, 'uploads') };
}

/** Store a generated image at full resolution (it is what gets printed). */
export async function storeResult(base64: string): Promise<string> {
  const jpeg = await sharp(Buffer.from(base64, 'base64')).jpeg({ quality: 92 }).toBuffer();
  return upload(jpeg, 'results');
}

/** Remove stored shop files (ignores data URLs and anything outside our shop/ folder). */
export async function deleteStored(urls: string[]): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  const paths = urls.filter((u) => u.startsWith(prefix + 'shop/')).map((u) => u.slice(prefix.length));
  if (paths.length === 0) return;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!res.ok) throw new Error(`storage delete failed ${res.status}`);
}

export function isStorageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}
