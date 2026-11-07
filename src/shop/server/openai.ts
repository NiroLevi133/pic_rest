/**
 * OpenAI image generation in background mode (Responses API + image_generation tool).
 * A generation can take over a minute, longer than a serverless request may run,
 * so we start it, keep the response id, and check it on later polls.
 */

/** Overridable for tests or an API gateway; defaults to OpenAI. */
const API = `${(process.env.SHOP_OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')}/responses`;
/** The text model only routes the request to the image tool. */
const ROUTER_MODEL = process.env.SHOP_OPENAI_ROUTER_MODEL || 'gpt-5.4-mini';
const IMAGE_MODEL = process.env.SHOP_OPENAI_IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

function apiKey(): string {
  const key = process.env.SHOP_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  return key;
}

export function isImageGenerationConfigured(): boolean {
  return Boolean(process.env.SHOP_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
    // Next.js caches fetch() on the server by default; a status check must always hit the API.
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${data?.error?.message ?? 'request failed'}`);
  return data;
}

/** Start a background generation from a reference photo; returns the response id. */
export async function startImage(prompt: string, imageUrl: string): Promise<string> {
  const data = await call('', {
    method: 'POST',
    body: JSON.stringify({
      model: ROUTER_MODEL,
      background: true,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: `Generate this image exactly as specified. Do not reply with text.\n\n${prompt}` },
          { type: 'input_image', image_url: imageUrl },
        ],
      }],
      tools: [{ type: 'image_generation', model: IMAGE_MODEL, size: '1024x1024', quality: 'high' }],
      tool_choice: { type: 'image_generation' },
    }),
  });
  return data.id as string;
}

export type ImageStatus =
  | { state: 'pending' }
  | { state: 'done'; base64: string }
  | { state: 'error'; message: string };

/** Check a background generation once. */
export async function checkImage(responseId: string): Promise<ImageStatus> {
  const data = await call(`/${responseId}`);
  if (data.status === 'queued' || data.status === 'in_progress') return { state: 'pending' };
  if (data.status !== 'completed') return { state: 'error', message: data.error?.message ?? `generation ${data.status}` };
  const image = (data.output ?? []).find((o: { type: string; result?: string }) => o.type === 'image_generation_call' && o.result);
  if (!image) return { state: 'error', message: 'no image returned' };
  return { state: 'done', base64: image.result as string };
}

/** Health check: is the key valid and the image model available to it? (free, no generation) */
export async function checkOpenAIAccess(): Promise<{ ok: boolean; model: string; error?: string }> {
  try {
    const base = (process.env.SHOP_OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const res = await fetch(`${base}/models/${IMAGE_MODEL}`, {
      headers: { Authorization: `Bearer ${apiKey()}` }, cache: 'no-store', signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true, model: IMAGE_MODEL };
    const data = await res.json().catch(() => null);
    return { ok: false, model: IMAGE_MODEL, error: `${res.status}: ${data?.error?.message ?? 'request failed'}`.slice(0, 200) };
  } catch (e) {
    return { ok: false, model: IMAGE_MODEL, error: String(e instanceof Error ? e.message : e).slice(0, 200) };
  }
}
