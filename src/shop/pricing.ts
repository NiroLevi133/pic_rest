/** One product for now: a 20×20 cm framed tile, black or white frame. */

export type FrameId = 'black' | 'white';

export const TILE = { label: '20×20', cm: 20 } as const;

export const FRAMES: { id: FrameId; label: string }[] = [
  { id: 'black', label: 'שחור' },
  { id: 'white', label: 'לבן' },
];

export const TILE_PRICE = 89;

/** Buy more, pay less — by total number of tiles in the order. */
export const BUNDLE_TIERS = [
  { minQty: 6, percent: 20 },
  { minQty: 3, percent: 10 },
] as const;

export const FREE_SHIPPING_FROM = 249;
export const SHIPPING_PRICE = 29;
export const MAX_QTY = 20;

export function isFrameId(v: unknown): v is FrameId {
  return v === 'black' || v === 'white';
}

export function frameLabel(id: FrameId): string {
  return FRAMES.find((f) => f.id === id)?.label ?? id;
}

export function bundleDiscountPercent(totalQty: number): number {
  return BUNDLE_TIERS.find((t) => totalQty >= t.minQty)?.percent ?? 0;
}

export interface Totals {
  qty: number;
  subtotal: number;
  discountPercent: number;
  discount: number;
  shipping: number;
  total: number;
  /** How much more to spend for free shipping (0 when already free or empty). */
  toFreeShipping: number;
}

export function orderTotals(quantities: number[]): Totals {
  const qty = quantities.reduce((n, q) => n + q, 0);
  const subtotal = qty * TILE_PRICE;
  const discountPercent = bundleDiscountPercent(qty);
  const discount = Math.round((subtotal * discountPercent) / 100);
  const afterDiscount = subtotal - discount;
  const free = qty === 0 || afterDiscount >= FREE_SHIPPING_FROM;
  const shipping = free ? 0 : SHIPPING_PRICE;
  return {
    qty, subtotal, discountPercent, discount, shipping,
    total: afterDiscount + shipping,
    toFreeShipping: free ? 0 : FREE_SHIPPING_FROM - afterDiscount,
  };
}

export function formatPrice(n: number): string {
  return `₪${n.toLocaleString('he-IL')}`;
}
