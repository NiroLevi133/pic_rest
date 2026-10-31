import fs from 'fs';
import path from 'path';

/** Style key used for NIRO BAR quote flyers (same key the old lab used). */
export const NIRO_BAR_QUOTE_KEY = 'niroBarQuote';

// Cached in module scope — read once per warm serverless instance.
let referenceDataUrl: string | null | undefined;

/** The bundled NIRO BAR quote design reference, sent as an image alongside the prompt so the model matches its layout/style closely. */
export function getNiroBarReferenceImage(): string | null {
  if (referenceDataUrl !== undefined) return referenceDataUrl;
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'niro-bar-quote-reference.webp'));
    referenceDataUrl = `data:image/webp;base64,${buf.toString('base64')}`;
  } catch (err) {
    console.error('[niro-bar] failed to load reference image', err);
    referenceDataUrl = null;
  }
  return referenceDataUrl;
}
