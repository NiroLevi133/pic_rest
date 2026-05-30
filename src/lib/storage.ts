import sharp from 'sharp';
import { randomBytes } from 'crypto';
import { resizeForGallery } from './image-resize';

/**
 * Supabase Storage helper.
 *
 * Images are uploaded to a public bucket and served directly from Supabase's
 * CDN, instead of being stored as base64 blobs inside Postgres. This removes
 * the database + serverless function from the image-serving hot path.
 *
 * If the Supabase env vars are missing the helpers fall back to returning a
 * base64 data URL, so the app keeps working before storage is configured.
 */

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || 'dish-images';

/** Max width (px) for stored images */
const MAX_WIDTH = 1024;
/** JPEG quality */
const QUALITY = 80;

export function isStorageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

/** True if the value is an already-hosted http(s) URL (not a base64 data URL). */
export function isHttpUrl(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^https?:\/\//.test(value);
}

/** True if the value is a URL served from our Supabase Storage bucket. */
export function isStorageUrl(value: string | null | undefined): boolean {
  return Boolean(value && SUPABASE_URL && value.startsWith(`${SUPABASE_URL}/storage`));
}

/** Decode a data URL or fetch a remote URL into a raw buffer. */
async function toRawBuffer(input: string): Promise<Buffer> {
  if (input.startsWith('data:')) {
    const comma = input.indexOf(',');
    return Buffer.from(input.slice(comma + 1), 'base64');
  }
  const res = await fetch(input, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`fetch image failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Resize/compress to a web-friendly JPEG buffer. */
async function toJpegBuffer(input: string): Promise<Buffer> {
  const raw = await toRawBuffer(input);
  return sharp(raw)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
    .toBuffer();
}

/** Upload a buffer to the storage bucket and return its public URL. */
async function uploadBuffer(buffer: Buffer, prefix: string): Promise<string> {
  const path = `${prefix}/${Date.now()}-${randomBytes(8).toString('hex')}.jpg`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'x-upsert': 'true',
    },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    throw new Error(`storage upload failed ${res.status}: ${await res.text()}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * Persist a generated image. Accepts a base64 data URL or a remote URL.
 * Returns a public CDN URL when storage is configured, otherwise a compressed
 * base64 data URL (legacy fallback) so the app keeps working.
 */
export async function persistImage(input: string, prefix = 'dishes'): Promise<string> {
  // Already hosted — nothing to do.
  if (isHttpUrl(input) && SUPABASE_URL && input.startsWith(`${SUPABASE_URL}/storage`)) {
    return input;
  }

  if (!isStorageConfigured()) {
    // Fallback: keep previous behaviour (compressed base64 in DB).
    return resizeForGallery(input);
  }

  const buffer = await toJpegBuffer(input);
  return uploadBuffer(buffer, prefix);
}
