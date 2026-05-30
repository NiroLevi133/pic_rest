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
Maintain the EXACT same real person throughout the entire video with absolute fidelity and maximum consistency.
The generated person must look like the SAME real person shown in the reference image.
Do not reinterpret, redesign, beautify, stylize, or modify the character in any way.
Preserve exactly: face shape, facial structure, eyes, eyebrows, eyelashes, nose, lips, teeth, jawline, chin, ears, skin tone, skin texture, hair style, hair color, hair length, body proportions, clothing, clothing colors, clothing textures, accessories, natural expression, and unique identifying features.
The character must remain completely identical from the first frame to the final frame.

VIDEO TYPE:
Professional luxury fashion studio showcase.
Duration: 6 seconds.
Single continuous shot.
One uninterrupted take.
No cuts.
No transitions.
No scene changes.

CAMERA MOVEMENT:
Perform a complete 360-degree orbit around the character.
The camera must move smoothly and continuously at a constant speed.
The camera starts directly in front of the character.
The camera travels around the entire body in a perfect circular path.
The camera finishes in the exact same front-facing position where it started.
The orbit must be fluid and cinematic.
No sudden acceleration.
No sudden deceleration.
No camera shake.
No handheld effect.
No zoom in.
No zoom out.
No focus breathing.
No framing changes.
Maintain the exact same camera distance throughout the entire video.
Maintain the exact same camera height throughout the entire video.

STUDIO ENVIRONMENT:
Luxury professional photography studio.
Premium commercial fashion photography setup.
Clean seamless infinity cyclorama wall.
Soft neutral light-gray studio background.
No visible corners.
No visible seams.
No visible studio equipment.
No props.
No furniture.
No decorations.
No screens.
No signs.
No text.
No logos.
No watermarks.
No additional objects.
The background must remain completely static throughout the entire video.

LIGHTING:
Professional studio softbox lighting.
Large soft light sources positioned symmetrically.
Soft cinematic beauty lighting.
Balanced shadows.
Natural skin rendering.
Premium fashion catalog lighting.
Even illumination across the entire body.
Consistent lighting throughout the entire video.
No lighting changes.
No exposure shifts.
No color shifts.
No flickering.

COMPOSITION:
Full-body shot.
Entire body visible from head to toe at all times.
Character remains centered in frame.
Eye-level camera angle.
Consistent framing.
Consistent composition.
No cropping.
No reframing.

CHARACTER BEHAVIOR:
The character stands naturally in a relaxed neutral pose.
Arms relaxed naturally.
Natural posture.
Natural facial expression.
Character remains completely still.
No walking.
No turning.
No gestures.
No pose changes.
No facial expression changes.
No blinking animations.
No body movement.

TIMELINE:
Second 0.0-0.5: Front-facing view. Character looks directly toward camera. Full body visible. Camera perfectly centered. Establishes the exact appearance of the character.
Second 0.5-1.0: Camera begins a smooth clockwise orbit. Front-right three-quarter angle. Approximately 45 degrees. Maintain perfect facial consistency.
Second 1.0-1.5: Right-side profile. Approximately 90 degrees. Camera movement remains perfectly smooth. Character remains motionless.
Second 1.5-2.0: Rear-right three-quarter angle. Approximately 135 degrees. All clothing details remain identical.
Second 2.0-2.5: Direct rear view. Approximately 180 degrees. Perfect consistency in body proportions and clothing.
Second 2.5-3.0: Rear-left three-quarter angle. Approximately 225 degrees. Background and lighting remain unchanged.
Second 3.0-3.5: Left-side profile. Approximately 270 degrees. Character remains perfectly centered.
Second 3.5-4.0: Front-left three-quarter angle. Approximately 315 degrees. Maintain exact identity.
Second 4.0-4.5: Return toward front view. Camera continues moving smoothly. No speed changes.
Second 4.5-5.0: Nearly identical to original angle. Facial features remain perfectly preserved.
Second 5.0-5.5: Camera aligns with the original front-facing position. Character remains identical to opening frame.
Second 5.5-6.0: Final hero shot. Exact front-facing view. Final frame should closely match the first frame.

CONSISTENCY REQUIREMENTS:
Perfect facial consistency.
Perfect identity preservation.
Perfect clothing consistency.
Perfect body consistency.
Perfect skin consistency.
Perfect hair consistency.
Perfect color consistency.
Perfect background consistency.
Perfect lighting consistency.
Perfect camera distance consistency.
No identity drift.
No face morphing.
No body morphing.
No clothing changes.
No hairstyle changes.
No accessory changes.
No age changes.
No gender changes.
No skin tone changes.
No proportion changes.
No visual artifacts.

VISUAL QUALITY:
Ultra realistic.
Photorealistic.
Luxury fashion campaign.
High-end commercial photography.
Professional studio production.
DSLR photography quality.
Sharp focus.
Natural skin texture.
Realistic fabric details.
Premium catalog photography.
Extremely high character consistency.
Smooth cinematic camera motion.
Perfect 360-degree turntable presentation.

The final result should look like a professional fashion catalog video where a camera performs a flawless 360-degree orbit around the exact same real person from the reference image while preserving every visual detail with maximum consistency.`;

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
  durationSeconds = 6,
): Promise<string> {
  const { mimeType, data } = parseDataUrl(referenceImage);
  const res = await fetch(`${BASE}/models/${model()}:predictLongRunning`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt, image: { bytesBase64Encoded: data, mimeType } }],
      parameters: { aspectRatio, durationSeconds },
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
