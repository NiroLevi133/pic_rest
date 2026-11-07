/**
 * Store settings. Everything the storefront needs to know about the business lives here,
 * so the store can be moved to its own app/domain without touching the workspace.
 */

/**
 * URL prefix the store is mounted under. Inside NIRO Workspace it lives at /shop;
 * when the store is split into its own app, set NEXT_PUBLIC_SHOP_BASE_PATH="" and it runs at the root.
 */
export const SHOP_BASE = process.env.NEXT_PUBLIC_SHOP_BASE_PATH ?? '/shop';

/** Build a store page link that keeps working when the store moves to its own domain. */
export function shopHref(path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p === '/') return SHOP_BASE || '/';
  return `${SHOP_BASE}${p}`;
}

/** Store API base (same rule as pages). */
export function shopApi(path: string): string {
  return `${SHOP_BASE ? '/api/shop' : '/api'}${path.startsWith('/') ? path : `/${path}`}`;
}

export const SHOP = {
  name: 'קירי',
  nameLatin: 'KIRI',
  tagline: 'תמונה אחת שלכם. יצירת אמנות על הקיר.',
  /** Orders are sent to this WhatsApp number (international format, digits only, e.g. 972501234567). */
  whatsapp: (process.env.NEXT_PUBLIC_SHOP_WHATSAPP || '').replace(/\D/g, ''),
  /** Variations generated for every upload. */
  variationsPerUpload: 4,
  deliveryDays: '5–7 ימי עסקים',
} as const;
