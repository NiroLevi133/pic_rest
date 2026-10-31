/**
 * OpenAI image generation in background mode (Responses API + image_generation
 * tool). A generation takes 1–3 minutes, longer than a serverless request may
 * run, so we start it, store the response id, and check it on later polls.
 */

const API = 'https://api.openai.com/v1/responses';
/** The orchestrating text model only routes the request to the image tool. */
const ROUTER_MODEL = 'gpt-5.4-mini';

export interface OpenAIImageJob {
  prompt: string;
  /** data URLs or http URLs of reference images */
  images: string[];
  model: string;
  /** e.g. 1024x1536 */
  size?: string;
}

export type OpenAIImageStatus =
  | { state: 'pending' }
  | { state: 'done'; imageDataUrl: string }
  | { state: 'error'; message: string };

async function call(apiKey: string, path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`OpenAI ${res.status}: ${msg}`);
  }
  return data;
}

/** Start a background generation and return its response id. */
export async function startOpenAIImage(apiKey: string, job: OpenAIImageJob): Promise<string> {
  const data = await call(apiKey, '', {
    method: 'POST',
    body: JSON.stringify({
      model: ROUTER_MODEL,
      background: true,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: `Generate this image exactly as specified. Do not reply with text.\n\n${job.prompt}` },
          ...job.images.map((url) => ({ type: 'input_image', image_url: url })),
        ],
      }],
      tools: [{ type: 'image_generation', model: job.model, size: job.size ?? 'auto', quality: 'high' }],
      tool_choice: { type: 'image_generation' },
    }),
  });
  return data.id as string;
}

/** Check a background generation once. */
export async function checkOpenAIImage(apiKey: string, responseId: string): Promise<OpenAIImageStatus> {
  const data = await call(apiKey, `/${responseId}`);
  if (data.status === 'queued' || data.status === 'in_progress') return { state: 'pending' };
  if (data.status !== 'completed') {
    return { state: 'error', message: data.error?.message ?? `OpenAI generation ${data.status}` };
  }
  const image = (data.output ?? []).find((o: { type: string; result?: string }) => o.type === 'image_generation_call' && o.result);
  if (!image) return { state: 'error', message: 'OpenAI returned no image' };
  return { state: 'done', imageDataUrl: `data:image/png;base64,${image.result}` };
}
