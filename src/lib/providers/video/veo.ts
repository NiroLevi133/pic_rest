/**
 * Google Veo (image-to-video) provider — used for the 360° turntable format.
 *
 * Veo runs as a long-running operation: we start it (returns an operation
 * name), poll until `done`, then download the resulting mp4. Polling/storage
 * is orchestrated by the API routes; this module only talks to the Veo API.
 */

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

function apiKey(): string {
  const key = process.env.GOOGLE_API_KEY || '';
  if (!key) throw new Error('GOOGLE_API_KEY not set');
  return key;
}

/** veo-3.1-fast is the cost-effective default; override via VEO_MODEL. */
function model(): string {
  return process.env.VEO_MODEL || 'veo-3.1-fast-generate-preview';
}

/** Default turntable prompt — a smooth 360° orbit with a still subject. */
export const TURNTABLE_PROMPT =
  'Smooth cinematic 360-degree turntable orbit: the camera slowly and steadily circles all the way around the subject at a constant speed, showing every side (front, sides, and back) in one continuous rotation. The subject stays completely still and centered. Keep the subject\'s identity, clothing, colors and proportions perfectly consistent throughout. Clean neutral studio background, soft even lighting, no cuts, no text.';

function parseDataUrl(input: string): { mimeType: string; data: string } {
  if (input.startsWith('data:')) {
    const comma = input.indexOf(',');
    const mimeType = input.slice(5, comma).split(';')[0] || 'image/jpeg';
    return { mimeType, data: input.slice(comma + 1) };
  }
  // assume raw base64 jpeg
  return { mimeType: 'image/jpeg', data: input };
}

/** Start an image-to-video turntable generation. Returns the operation name. */
export async function startTurntable(
  referenceImage: string,
  prompt = TURNTABLE_PROMPT,
  aspectRatio = '9:16',
): Promise<string> {
  const { mimeType, data } = parseDataUrl(referenceImage);
  const res = await fetch(`${BASE}/models/${model()}:predictLongRunning`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt, image: { bytesBase64Encoded: data, mimeType } }],
      parameters: { aspectRatio },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`Veo start ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json() as { name?: string };
  if (!json.name) throw new Error('Veo: no operation name returned');
  return json.name;
}

/** Recursively find the first { uri } or { bytesBase64Encoded } video payload. */
function findVideo(obj: unknown): { uri?: string; bytes?: string } | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.uri === 'string' && /\.(mp4|video)/i.test(o.uri)) return { uri: o.uri };
  if (typeof o.bytesBase64Encoded === 'string') return { bytes: o.bytesBase64Encoded };
  // common nesting: { video: { uri | bytesBase64Encoded } }
  if (o.video && typeof o.video === 'object') {
    const v = o.video as Record<string, unknown>;
    if (typeof v.uri === 'string') return { uri: v.uri };
    if (typeof v.bytesBase64Encoded === 'string') return { bytes: v.bytesBase64Encoded };
  }
  for (const val of Object.values(o)) {
    const found = findVideo(val);
    if (found) return found;
  }
  return null;
}

export interface VeoStatus {
  done: boolean;
  videoBuffer?: Buffer;
  error?: string;
}

/** Poll an operation. When done, downloads and returns the mp4 bytes. */
export async function checkOperation(operationName: string): Promise<VeoStatus> {
  const res = await fetch(`${BASE}/${operationName}`, {
    headers: { 'x-goog-api-key': apiKey() },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Veo poll ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const op = await res.json() as {
    done?: boolean;
    error?: { message?: string };
    response?: unknown;
  };

  if (!op.done) return { done: false };
  if (op.error) return { done: true, error: op.error.message || 'Veo generation failed' };

  const video = findVideo(op.response);
  if (!video) return { done: true, error: 'Veo finished but returned no video' };

  if (video.bytes) {
    return { done: true, videoBuffer: Buffer.from(video.bytes, 'base64') };
  }

  // Download the file URI (Files API requires the key).
  const dlUrl = video.uri!.includes('key=') ? video.uri! : `${video.uri}${video.uri!.includes('?') ? '&' : '?'}key=${apiKey()}`;
  const dl = await fetch(dlUrl, { headers: { 'x-goog-api-key': apiKey() }, signal: AbortSignal.timeout(60_000) });
  if (!dl.ok) return { done: true, error: `Veo video download failed: ${dl.status}` };
  return { done: true, videoBuffer: Buffer.from(await dl.arrayBuffer()) };
}
