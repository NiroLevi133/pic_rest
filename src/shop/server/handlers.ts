/**
 * HTTP handlers for the store API. The files under src/app/api/shop only re-export these,
 * so moving the store means moving this folder.
 */
import { NextResponse } from 'next/server';
import { getStyle } from '../styles';
import { SHOP } from '../config';
import { newOrderRef, orderMessage, parseOrderItems, validateCheckout, whatsappUrl } from '../order';
import { orderTotals, TILE_PRICE } from '../pricing';
import type { CheckoutDetails } from '../types';
import { db } from './db';
import { createGeneration, refreshGeneration, variantImage } from './generations';
import { checkDailyLimit, clientHash } from './limits';
import { purgeExpiredGenerations } from './cleanup';
import { checkOpenAIAccess, isImageGenerationConfigured } from './openai';
import { hasStylePrompt } from './prompts';
import { InvalidImageError, isStorageConfigured, storeUpload } from './storage';
import { ensureShopTables } from './schema';

/** ~8MB of base64 — the browser resizes photos before upload, so real uploads are far smaller. */
const MAX_UPLOAD_CHARS = 8 * 1024 * 1024;

function fail(status: number, error: string, code?: string) {
  return NextResponse.json({ success: false, error, ...(code ? { code } : {}) }, { status });
}

/** A short, non-secret reason code for logs and the error message, so failures can be diagnosed from a screenshot. */
export function errorCode(e: unknown): string {
  const m = String(e instanceof Error ? e.message : e);
  if (/OpenAI 401/.test(m)) return 'openai-key';
  if (/OpenAI 403/.test(m)) return 'openai-access';
  if (/OpenAI 404/.test(m) || /model/i.test(m) && /OpenAI 400/.test(m)) return 'openai-model';
  if (/OpenAI 429/.test(m)) return 'openai-quota';
  if (/OpenAI \d+/.test(m)) return 'openai';
  if (/does not exist|P2021|relation .* does not exist/i.test(m)) return 'db-missing-table';
  if (/P10\d\d|Can't reach database|connect/i.test(m)) return 'db-connection';
  if (/storage/i.test(m)) return 'storage';
  if (/abort|timeout/i.test(m)) return 'timeout';
  return 'server';
}

/** Never let an unexpected error escape as an empty 500: always answer with JSON and a reason code. */
function guarded<A extends unknown[]>(name: string, fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      // A request body can be read only once: keep a copy for the retry below.
      const retryArgs = (args[0] instanceof Request ? [args[0].clone(), ...args.slice(1)] : args) as A;
      try {
        return await fn(...args);
      } catch (e) {
        // First use on a database the deploy didn't migrate: create the store tables and try once more.
        if (errorCode(e) !== 'db-missing-table') throw e;
        await ensureShopTables();
        return await fn(...retryArgs);
      }
    } catch (e) {
      const code = errorCode(e);
      console.error(`[shop] ${name} failed (${code}):`, e);
      return fail(500, 'משהו השתבש אצלנו. נסו שוב בעוד רגע', code);
    }
  };
}

/** POST { styleId, image: dataURL, consent: true } → starts 4 variations. */
async function postGenerationImpl(req: Request) {
  const body = await req.json().catch(() => null) as { styleId?: unknown; image?: unknown; consent?: unknown } | null;
  if (!body || typeof body.styleId !== 'string' || !getStyle(body.styleId) || !hasStylePrompt(body.styleId)) return fail(400, 'סגנון לא קיים');
  if (body.consent !== true) return fail(400, 'יש לאשר את תנאי השימוש בתמונה');
  if (typeof body.image !== 'string' || body.image.length > MAX_UPLOAD_CHARS) return fail(400, 'התמונה גדולה מדי');
  if (!isImageGenerationConfigured()) return fail(503, 'היצירה לא זמינה כרגע. נסו שוב מאוחר יותר');

  const hash = clientHash(req);
  const limit = await checkDailyLimit(hash);
  if (!limit.ok) {
    return fail(429, limit.reason === 'client'
      ? 'הגעתם למספר היצירות היומי. אפשר לנסות שוב מחר'
      : 'יש עומס גדול כרגע. נסו שוב בעוד כמה שעות');
  }

  let photo;
  try {
    photo = await storeUpload(body.image);
  } catch (e) {
    if (e instanceof InvalidImageError) return fail(400, 'לא הצלחנו לקרוא את התמונה. נסו תמונה אחרת (JPG או PNG, לפחות 256 פיקסלים)');
    console.error('[shop] upload failed', e);
    return fail(500, 'העלאת התמונה נכשלה. נסו שוב', errorCode(e));
  }

  try {
    const generation = await createGeneration(body.styleId, photo, hash);
    // Privacy: drop old, never-ordered uploads. Never let it fail the upload.
    await purgeExpiredGenerations().catch((e) => console.error('[shop] cleanup failed', e));
    return NextResponse.json({ success: true, data: generation });
  } catch (e) {
    const code = errorCode(e);
    console.error(`[shop] generation failed (${code})`, e);
    return fail(502, 'היצירה נכשלה. נסו שוב בעוד רגע', code);
  }
}

/** GET → generation status and ready images (checks OpenAI for pending ones). */
async function getGenerationImpl(_req: Request, { params }: { params: { id: string } }) {
  if (!/^[a-z0-9]{10,40}$/i.test(params.id)) return fail(404, 'לא נמצא');
  try {
    const g = await refreshGeneration(params.id);
    if (!g) return fail(404, 'לא נמצא');
    return NextResponse.json({ success: true, data: g }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[shop] refresh failed', e);
    return fail(500, 'שגיאה בבדיקת הסטטוס');
  }
}

/** POST { items, details } → saves the order and returns its reference + WhatsApp link. */
async function postOrderImpl(req: Request) {
  const body = await req.json().catch(() => null) as { items?: unknown; details?: Partial<CheckoutDetails> } | null;
  const items = parseOrderItems(body?.items);
  if (!items) return fail(400, 'העגלה לא תקינה');
  const d = body?.details ?? {};
  const details: CheckoutDetails = {
    name: String(d.name ?? '').slice(0, 100), phone: String(d.phone ?? '').slice(0, 30),
    city: String(d.city ?? '').slice(0, 80), address: String(d.address ?? '').slice(0, 200), notes: String(d.notes ?? '').slice(0, 1000),
  };
  const errors = validateCheckout(details);
  if (Object.keys(errors).length) return NextResponse.json({ success: false, error: 'חסרים פרטים', errors }, { status: 400 });

  // Prices and images come from the server, never from the browser.
  const withImages = await Promise.all(items.map(async (it) => ({ ...it, imageUrl: await variantImage(it.generationId, it.variant) })));
  if (withImages.some((it) => !it.imageUrl)) return fail(400, 'אחת התמונות בעגלה כבר לא זמינה. הסירו אותה ונסו שוב');
  const lines = withImages as (typeof withImages[number] & { imageUrl: string })[];
  const totals = orderTotals(lines.map((l) => l.qty));

  const ref = newOrderRef();
  await db.shopOrder.create({
    data: {
      ref, name: details.name.trim(), phone: details.phone.trim(), city: details.city.trim(), address: details.address.trim(),
      notes: details.notes.trim() || null,
      items: lines.map((l) => ({ generationId: l.generationId, variant: l.variant, imageUrl: l.imageUrl, frame: l.frame, qty: l.qty, unitPrice: TILE_PRICE })),
      subtotal: totals.subtotal, discount: totals.discount, shipping: totals.shipping, total: totals.total,
    },
  });

  return NextResponse.json({
    success: true,
    data: { ref, total: totals.total, whatsappUrl: SHOP.whatsapp ? whatsappUrl(orderMessage(ref, lines, details)) : null },
  });
}

/**
 * GET → what the store needs, without exposing any secret: database tables, OpenAI key + model access, storage.
 * Open /api/shop/health in the browser to diagnose a failing store.
 */
async function healthImpl() {
  const count = () => db.shopGeneration.count().then(() => ({ ok: true as boolean, error: undefined as string | undefined }));
  const dbCheck = await count().catch(async (e) => {
    if (errorCode(e) !== 'db-missing-table') return { ok: false, error: errorCode(e) };
    await ensureShopTables();
    return count();
  }).catch((e) => ({ ok: false, error: errorCode(e) }));
  const openai = isImageGenerationConfigured() ? await checkOpenAIAccess() : { ok: false, error: 'OPENAI_API_KEY is not set' };
  const storage = { ok: isStorageConfigured(), note: isStorageConfigured() ? undefined : 'Supabase storage not configured: images are kept in the database' };
  const whatsapp = { ok: Boolean(SHOP.whatsapp) };
  const ok = dbCheck.ok && openai.ok;
  return NextResponse.json({ ok, database: dbCheck, openai, storage, whatsapp }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}

export const health = guarded('health', healthImpl);
export const postGeneration = guarded('postGeneration', postGenerationImpl);
export const getGeneration = guarded('getGeneration', getGenerationImpl);
export const postOrder = guarded('postOrder', postOrderImpl);
