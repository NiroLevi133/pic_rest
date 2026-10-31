/**
 * Quote totals — pure, integer agorot, no AI involved. Used by the wizard for
 * the live preview and by the API, which always recomputes before saving.
 */

export type PriceMode = 'TOTAL' | 'PER_PERSON' | 'ITEMS';
export type DiscountType = 'AMOUNT' | 'PERCENT';
export type VatType = 'EXEMPT' | 'LICENSED' | 'COMPANY';

export interface PriceTier {
  min?: number | null;
  max?: number | null;
  /** Price per person, agorot */
  price: number;
}

export interface QuoteLineInput {
  description: string;
  quantity: number;
  /** agorot */
  unitPrice: number;
}

export interface QuoteMathInput {
  priceMode: PriceMode;
  packagePrice?: number;
  tiers?: PriceTier[];
  guestCount?: number | null;
  items?: QuoteLineInput[];
  discountType?: DiscountType;
  /** AMOUNT: agorot. PERCENT: basis points (1000 = 10%). */
  discountValue?: number;
  vatType: VatType;
  /** Percent, e.g. 18 */
  vatRate: number;
  pricesIncludeVat?: boolean;
}

export interface QuoteLine {
  kind: 'package' | 'item';
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuoteTotals {
  lines: QuoteLine[];
  subtotal: number;
  discountAmount: number;
  /** Amount before VAT */
  net: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  /** The tier that matched the guest count (PER_PERSON) */
  matchedTier: PriceTier | null;
  warnings: string[];
}

export function tierLabel(tier: Pick<PriceTier, 'min' | 'max'>): string {
  const { min, max } = tier;
  if (min && max) return `${min}–${max}`;
  if (max) return `עד ${max}`;
  if (min) return `מעל ${min}`;
  return '';
}

/** First tier whose [min, max] range contains the guest count (bounds inclusive, missing bound = open). */
export function findTier(tiers: PriceTier[], guests: number): PriceTier | null {
  return tiers.find((t) => (t.min == null || guests >= t.min) && (t.max == null || guests <= t.max)) ?? null;
}

export function computeQuote(input: QuoteMathInput): QuoteTotals {
  const lines: QuoteLine[] = [];
  const warnings: string[] = [];
  let matchedTier: PriceTier | null = null;

  if (input.priceMode === 'TOTAL') {
    const price = Math.max(0, Math.round(input.packagePrice ?? 0));
    if (price > 0) lines.push({ kind: 'package', description: 'מחיר החבילה', quantity: 1, unitPrice: price, total: price });
    else warnings.push('לא הוזן מחיר חבילה');
  } else if (input.priceMode === 'PER_PERSON') {
    const tiers = (input.tiers ?? []).filter((t) => t.price > 0);
    const guests = input.guestCount ?? 0;
    if (tiers.length === 0) warnings.push('לא הוזנו מדרגות מחיר');
    else if (!guests) warnings.push('חסרה כמות אורחים לחישוב המחיר');
    else {
      matchedTier = findTier(tiers, guests);
      if (!matchedTier) warnings.push(`אין מדרגת מחיר שמתאימה ל-${guests} אורחים`);
      else {
        const label = tierLabel(matchedTier);
        lines.push({
          kind: 'package',
          description: `מחיר לאדם${label ? ` (${label} משתתפים)` : ''}`,
          quantity: guests,
          unitPrice: matchedTier.price,
          total: matchedTier.price * guests,
        });
      }
    }
  }

  for (const item of input.items ?? []) {
    if (!item.description.trim() && !item.unitPrice) continue;
    const quantity = item.quantity > 0 ? item.quantity : 1;
    lines.push({
      kind: 'item',
      description: item.description.trim(),
      quantity,
      unitPrice: Math.round(item.unitPrice),
      total: Math.round(quantity * item.unitPrice),
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);

  let discountAmount = 0;
  const dv = Math.max(0, input.discountValue ?? 0);
  if (dv > 0) {
    discountAmount = input.discountType === 'PERCENT'
      ? Math.round((subtotal * Math.min(dv, 10000)) / 10000)
      : Math.min(dv, subtotal);
  }
  const afterDiscount = subtotal - discountAmount;

  const vatApplies = input.vatType !== 'EXEMPT' && input.vatRate > 0;
  const vatRate = vatApplies ? input.vatRate : 0;
  let net = afterDiscount;
  let vatAmount = 0;
  let total = afterDiscount;
  if (vatApplies) {
    if (input.pricesIncludeVat) {
      vatAmount = Math.round((afterDiscount * vatRate) / (100 + vatRate));
      net = afterDiscount - vatAmount;
    } else {
      vatAmount = Math.round((afterDiscount * vatRate) / 100);
      total = afterDiscount + vatAmount;
    }
  }

  return { lines, subtotal, discountAmount, net, vatRate, vatAmount, total, matchedTier, warnings };
}

/** Remaining balance of a quote given the amounts already paid (never negative). */
export function balanceDue(total: number, paid: number): number {
  return Math.max(0, total - paid);
}
