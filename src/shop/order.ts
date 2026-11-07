import { SHOP } from './config';
import { frameLabel, formatPrice, isFrameId, MAX_QTY, orderTotals, TILE, TILE_PRICE } from './pricing';
import type { CheckoutDetails, OrderItemInput } from './types';

/** Israeli mobile/landline, with or without +972 / dashes / spaces. */
export function isValidIsraeliPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-()]/g, '').replace(/^\+?972/, '0');
  return /^0(5\d|[2-489]|7\d)\d{7}$/.test(digits);
}

export type CheckoutErrors = Partial<Record<keyof CheckoutDetails, string>>;

export function validateCheckout(d: CheckoutDetails): CheckoutErrors {
  const errors: CheckoutErrors = {};
  if (d.name.trim().length < 2) errors.name = 'נא למלא שם מלא';
  if (!isValidIsraeliPhone(d.phone)) errors.phone = 'מספר טלפון לא תקין';
  if (d.city.trim().length < 2) errors.city = 'נא למלא עיר';
  if (d.address.trim().length < 3) errors.address = 'נא למלא כתובת למשלוח';
  return errors;
}

/** Shape-check order items coming from the browser. */
export function parseOrderItems(raw: unknown): OrderItemInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 30) return null;
  const items: OrderItemInput[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') return null;
    const { generationId, variant, frame, qty } = r as Record<string, unknown>;
    if (typeof generationId !== 'string' || !/^[a-z0-9]{10,40}$/i.test(generationId)) return null;
    if (!Number.isInteger(variant) || (variant as number) < 0 || (variant as number) > 9) return null;
    if (!isFrameId(frame)) return null;
    if (!Number.isInteger(qty) || (qty as number) < 1 || (qty as number) > MAX_QTY) return null;
    items.push({ generationId, variant: variant as number, frame, qty: qty as number });
  }
  return items;
}

export function newOrderRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `K-${s}`;
}

/** The order as a plain-text WhatsApp message, with a link to every image to print. */
export function orderMessage(ref: string, items: (OrderItemInput & { imageUrl: string })[], d: CheckoutDetails): string {
  const t = orderTotals(items.map((i) => i.qty));
  const lines = items.map((it, n) =>
    `${n + 1}. אריח ${TILE.label} · מסגרת ${frameLabel(it.frame)} · ×${it.qty} · ${formatPrice(TILE_PRICE * it.qty)}\n   ${it.imageUrl.startsWith('data:') ? '(תמונה שמורה במערכת)' : it.imageUrl}`);
  return [
    `הזמנה חדשה מ${SHOP.name} – ${ref}`,
    '',
    ...lines,
    '',
    `סכום ביניים: ${formatPrice(t.subtotal)}`,
    ...(t.discount ? [`הנחת כמות (${t.discountPercent}%): -${formatPrice(t.discount)}`] : []),
    `משלוח: ${t.shipping ? formatPrice(t.shipping) : 'חינם'}`,
    `סה״כ: ${formatPrice(t.total)}`,
    '',
    `שם: ${d.name.trim()}`,
    `טלפון: ${d.phone.trim()}`,
    `כתובת: ${d.address.trim()}, ${d.city.trim()}`,
    ...(d.notes.trim() ? [`הערות: ${d.notes.trim()}`] : []),
  ].join('\n');
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(message)}`;
}
