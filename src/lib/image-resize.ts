import sharp from 'sharp';

/** Max width (px) for stored gallery images */
const GALLERY_MAX_WIDTH = 500;
/** JPEG quality 0-100 */
const GALLERY_QUALITY = 65;

/**
 * Takes a base64 data-URL or an https:// URL,
 * resizes to max GALLERY_MAX_WIDTH px wide (keeping aspect ratio),
 * converts to JPEG at GALLERY_QUALITY, and returns a base64 data-URL.
 */
export async function resizeForGallery(imageUrl: string): Promise<string> {
  let buffer: Buffer;

  if (imageUrl.startsWith('data:')) {
    const base64 = imageUrl.replace(/^data:image\/\w+;base64,/, '');
    buffer = Buffer.from(base64, 'base64');
  } else {
    const res = await fetch(imageUrl);
    buffer = Buffer.from(await res.arrayBuffer());
  }

  const resized = await sharp(buffer)
    .resize({ width: GALLERY_MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: GALLERY_QUALITY })
    .toBuffer();

  return `data:image/jpeg;base64,${resized.toString('base64')}`;
}
