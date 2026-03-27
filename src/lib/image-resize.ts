import sharp from 'sharp';

/** Max width (px) for gallery thumbnails */
const GALLERY_MAX_WIDTH = 420;
/** Max width (px) for full-size lightbox view */
const FULL_MAX_WIDTH = 1200;
/** JPEG quality for thumbnails */
const GALLERY_QUALITY = 72;
/** JPEG quality for full-size */
const FULL_QUALITY = 82;

async function toBuffer(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('data:')) {
    const base64 = imageUrl.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64, 'base64');
  }
  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Compress to thumbnail size (420px, q72) — stored in DB, served on grid.
 */
export async function resizeForGallery(imageUrl: string): Promise<string> {
  const buffer = await toBuffer(imageUrl);
  const resized = await sharp(buffer)
    .resize({ width: GALLERY_MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: GALLERY_QUALITY, progressive: true, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${resized.toString('base64')}`;
}

/**
 * Compress to full view (1200px, q82) — used when serving /api/images/[id] for lightbox.
 */
export async function resizeForFull(imageUrl: string): Promise<string> {
  const buffer = await toBuffer(imageUrl);
  const resized = await sharp(buffer)
    .resize({ width: FULL_MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: FULL_QUALITY, progressive: true, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${resized.toString('base64')}`;
}
