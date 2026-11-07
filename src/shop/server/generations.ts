import { db } from './db';
import { buildPrompt, variationCount } from './prompts';
import { checkImage, startImage } from './openai';
import { storeResult } from './storage';
import type { PublicGeneration, VariantStatus } from '../types';

interface StoredVariant {
  responseId?: string;
  status: VariantStatus;
  url?: string;
  error?: string;
}

/** A variation still pending after this long is given up on. */
const GIVE_UP_MS = 10 * 60 * 1000;

function overallStatus(variants: StoredVariant[]): PublicGeneration['status'] {
  if (variants.some((v) => v.status === 'pending')) return 'pending';
  return variants.some((v) => v.status === 'done') ? 'done' : 'error';
}

function toPublic(g: { id: string; styleId: string; status: string; variants: unknown; createdAt: Date }): PublicGeneration {
  const variants = (g.variants as StoredVariant[]).map((v) => ({ status: v.status, ...(v.url ? { url: v.url } : {}) }));
  return { id: g.id, styleId: g.styleId, status: g.status as PublicGeneration['status'], variants, createdAt: g.createdAt.toISOString() };
}

/** Start all variations for one uploaded photo. Throws if none could be started. */
export async function createGeneration(styleId: string, photo: { dataUrl: string; url: string }, clientHash: string): Promise<PublicGeneration> {
  const started = await Promise.allSettled(
    Array.from({ length: variationCount() }, (_, i) => startImage(buildPrompt(styleId, i), photo.dataUrl)),
  );
  const variants: StoredVariant[] = started.map((r) =>
    r.status === 'fulfilled' ? { responseId: r.value, status: 'pending' } : { status: 'error', error: String(r.reason).slice(0, 300) },
  );
  if (!variants.some((v) => v.status === 'pending')) {
    console.error('[shop] could not start any variation:', variants.map((v) => v.error));
    throw new Error('generation failed to start');
  }
  const g = await db.shopGeneration.create({
    data: { styleId, sourceUrl: photo.url, variants: variants as object[], status: 'pending', clientHash },
  });
  return toPublic(g);
}

/** Read a generation, checking any pending variations with OpenAI first. */
export async function refreshGeneration(id: string): Promise<PublicGeneration | null> {
  const g = await db.shopGeneration.findUnique({ where: { id } });
  if (!g) return null;
  if (g.status !== 'pending') return toPublic(g);

  const variants = g.variants as unknown as StoredVariant[];
  const expired = Date.now() - g.createdAt.getTime() > GIVE_UP_MS;
  let changed = false;

  await Promise.all(variants.map(async (v, i) => {
    if (v.status !== 'pending' || !v.responseId) return;
    try {
      const s = await checkImage(v.responseId);
      if (s.state === 'done') {
        variants[i] = { ...v, status: 'done', url: await storeResult(s.base64) };
        changed = true;
      } else if (s.state === 'error' || expired) {
        variants[i] = { ...v, status: 'error', error: s.state === 'error' ? s.message : 'timed out' };
        changed = true;
      }
    } catch (e) {
      // A failed check is retried on the next poll, unless we've waited too long.
      console.error(`[shop] checking variation ${i} of ${id} failed:`, e);
      if (expired) { variants[i] = { ...v, status: 'error', error: String(e).slice(0, 300) }; changed = true; }
    }
  }));

  if (!changed) return toPublic(g);
  const updated = await db.shopGeneration.update({
    where: { id },
    data: { variants: variants as object[], status: overallStatus(variants) },
  });
  return toPublic(updated);
}

/** The printable image of one ready variation, or null. */
export async function variantImage(generationId: string, variant: number): Promise<string | null> {
  const g = await db.shopGeneration.findUnique({ where: { id: generationId }, select: { variants: true } });
  const v = (g?.variants as StoredVariant[] | undefined)?.[variant];
  return v?.status === 'done' && v.url ? v.url : null;
}
