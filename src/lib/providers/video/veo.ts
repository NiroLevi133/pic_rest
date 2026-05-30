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
export const TURNTABLE_PROMPT = `Use the provided reference image as the sole source of truth for the character.

CRITICAL IDENTITY PRESERVATION:
Maintain the exact same real person throughout the entire video with absolute consistency. The character must remain identical to the reference image in every frame. Preserve exactly: face shape, facial structure, eyes, eyebrows, nose, lips, jawline, ears, skin tone, hairstyle, hair color, body proportions, clothing, clothing colors, textures, posture, and all unique identifying features.

The generated character must look like the same real person from the reference image, not a reinterpretation, not a similar person, and not a redesigned version.

VIDEO TYPE:
Professional fashion studio turntable presentation.

DURATION:
10 seconds.

SHOT TYPE:
Single continuous shot.

CAMERA MOVEMENT:
A perfectly smooth 360-degree orbit around the character.

No cuts.
No transitions.
No scene changes.
No camera shake.
No handheld movement.
No zooming.
No focus breathing.

The camera must move at a constant speed around the character while maintaining a fixed distance and fixed height.

STUDIO ENVIRONMENT:
Luxury professional photography studio.
Clean seamless infinity cyclorama background.
Soft neutral light gray background.
Minimalist studio environment.
No furniture.
No props.
No decorations.
No text.
No logos.
No watermarks.
No additional objects.
No moving elements.
The background must remain completely static throughout the video.

LIGHTING:
Professional commercial studio lighting.
Large softboxes.
Soft cinematic lighting.
Balanced shadows.
Even illumination across the entire body.
Natural skin rendering.
High-end fashion catalog lighting.
No dramatic shadows.
No color shifts.
No lighting changes during the shot.

COMPOSITION:
Full-body framing.
Entire body visible from head to toe at all times.
Character remains perfectly centered throughout the orbit.
Eye-level camera angle.
Consistent framing from beginning to end.

CHARACTER BEHAVIOR:
The character stands naturally in a relaxed neutral pose.
Arms remain in a natural resting position.
Natural facial expression.
The character remains still throughout the video.
No walking.
No pose changes.
No gestures.
No body movement.
No facial expression changes.

TIMELINE:
Second 0-1: Front view. Character facing directly toward camera. Establishing shot.
Second 1-2: Camera begins smooth clockwise orbit. 45-degree front-side angle.
Second 2-3: Right-side profile view. 90 degrees.
Second 3-4: 135-degree angle.
Second 4-5: Rear three-quarter view.
Second 5-6: Direct back view. 180 degrees.
Second 6-7: Rear three-quarter view from opposite side.
Second 7-8: Left-side profile view. 270 degrees.
Second 8-9: 315-degree angle.
Second 9-10: Return to the exact original front-facing position. Final frame should closely match the opening frame.

CONSISTENCY REQUIREMENTS:
Perfect facial consistency.
Perfect clothing consistency.
Perfect body consistency.
Perfect hair consistency.
Perfect color consistency.
Perfect lighting consistency.
Perfect background consistency.
Perfect camera distance consistency.
No identity drift.
No face morphing.
No body morphing.
No outfit changes.
No age changes.
No gender changes.
No hairstyle changes.
No skin tone changes.
No proportion changes.

VISUAL QUALITY:
Ultra realistic.
Photorealistic.
High-end commercial photography.
Luxury fashion campaign quality.
DSLR photography look.
Sharp focus.
Natural skin texture.
Professional studio production.
Extremely high character consistency.
Smooth cinematic camera motion.
360-degree turntable presentation.`;

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
