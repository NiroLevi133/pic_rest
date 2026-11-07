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
import { isImageGenerationConfigured } from './openai';
import { hasStylePrompt } from './prompts';
import { InvalidImageError, storeUpload } from './storage';

/** ~8MB of base64 — the browser resizes photos before upload, so real uploads are far smaller. */
const MAX_UPLOAD_CHARS = 8 * 1024 * 1024;

function fail(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

/** POST { styleId, image: dataURL, consent: true } → starts 4 variations. */
export async function postGeneration(req: Request) {
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
    return fail(500, 'העלאת התמונה נכשלה. נסו שוב');
  }

  try {
    const generation = await createGeneration(body.styleId, photo, hash);
    return NextResponse.json({ success: true, data: generation });
  } catch (e) {
    console.error('[shop] generation failed', e);
    return fail(502, 'היצירה נכשלה. נסו שוב בעוד רגע');
  }
}

/** GET → generation status and ready images (checks OpenAI for pending ones). */
export async function getGeneration(_req: Request, { params }: { params: { id: string } }) {
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
export async function postOrder(req: Request) {
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
