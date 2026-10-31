/**
 * Quote draft shape shared by the wizard and the API (client-safe, no I/O).
 * Money is integer agorot; dates are yyyy-mm-dd strings ('' = none).
 */
import type { DiscountType, PriceMode, PriceTier, QuoteLineInput, VatType } from './quote-math';
import { computeQuote, tierLabel } from './quote-math';
import { formatAmount } from './money';
import type { NiroBarQuoteFields } from './style-presets';

export const QUOTE_STATUSES = ['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type QuoteTemplate = 'GENERAL' | 'NIRO_BAR';

export const QUOTE_TEMPLATE_LABELS: Record<QuoteTemplate, string> = {
  GENERAL: 'הצעה כללית',
  NIRO_BAR: 'NIRO BAR — בר קוקטיילים',
};

/** Allowed manual status changes. */
export const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ['SENT'],
  SENT: ['APPROVED', 'REJECTED', 'EXPIRED'],
  EXPIRED: ['APPROVED', 'REJECTED'],
  REJECTED: ['APPROVED'],
  APPROVED: [],
};

export interface NiroFeature {
  title: string;
  description: string;
}

export interface QuoteDraft {
  customerId: string;
  template: QuoteTemplate;
  title: string;
  serviceType: string;
  clientRole: string;
  eventDate: string;
  location: string;
  guestCount: number | null;
  priceMode: PriceMode;
  packagePrice: number;
  tiers: PriceTier[];
  items: QuoteLineInput[];
  discountType: DiscountType;
  discountValue: number;
  pricesIncludeVat: boolean;
  extraHourPrice: number | null;
  depositAmount: number | null;
  paymentTerms: string;
  validUntil: string;
  clientNotes: string;
  internalNotes: string;
  niroFeatures: NiroFeature[];
  gift: string;
}

export const DEFAULT_NIRO_GIFT = '30 תמונות מודפסות על הקוקטיילים';

export function emptyQuoteDraft(customerId = '', template: QuoteTemplate = 'GENERAL'): QuoteDraft {
  return {
    customerId, template, title: '', serviceType: '', clientRole: '', eventDate: '', location: '', guestCount: null,
    priceMode: template === 'NIRO_BAR' ? 'TOTAL' : 'ITEMS', packagePrice: 0, tiers: [], items: [],
    discountType: 'AMOUNT', discountValue: 0, pricesIncludeVat: false, extraHourPrice: null, depositAmount: null,
    paymentTerms: '', validUntil: '', clientNotes: '', internalNotes: '',
    niroFeatures: [], gift: template === 'NIRO_BAR' ? DEFAULT_NIRO_GIFT : '',
  };
}

// ─── Normalization (untrusted JSON → QuoteDraft) ─────────────────────────────

const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown, min = 0, max = 1_000_000_000): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
};
const dateStr = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
function oneOf<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return options.includes(v as T) ? (v as T) : fallback;
}

export function normalizeQuoteDraft(raw: unknown): QuoteDraft {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const template = oneOf<QuoteTemplate>(r.template, ['GENERAL', 'NIRO_BAR'], 'GENERAL');
  const discountType = oneOf<DiscountType>(r.discountType, ['AMOUNT', 'PERCENT'], 'AMOUNT');
  return {
    customerId: str(r.customerId, 64),
    template,
    title: str(r.title, 200),
    serviceType: str(r.serviceType, 120),
    clientRole: str(r.clientRole, 120),
    eventDate: dateStr(r.eventDate),
    location: str(r.location, 200),
    guestCount: int(r.guestCount, 1, 100_000),
    priceMode: oneOf<PriceMode>(r.priceMode, ['TOTAL', 'PER_PERSON', 'ITEMS'], 'TOTAL'),
    packagePrice: int(r.packagePrice) ?? 0,
    tiers: (Array.isArray(r.tiers) ? r.tiers : []).slice(0, 10).map((t: Record<string, unknown>) => ({
      min: int(t?.min, 1, 100_000),
      max: int(t?.max, 1, 100_000),
      price: int(t?.price) ?? 0,
    })),
    items: (Array.isArray(r.items) ? r.items : []).slice(0, 100).map((it: Record<string, unknown>) => {
      const q = typeof it?.quantity === 'number' ? it.quantity : Number(it?.quantity);
      return {
        description: str(it?.description, 300),
        quantity: Number.isFinite(q) && q > 0 ? Math.min(Math.round(q * 100) / 100, 100_000) : 1,
        unitPrice: int(it?.unitPrice) ?? 0,
      };
    }),
    discountType,
    discountValue: int(r.discountValue, 0, discountType === 'PERCENT' ? 10000 : 1_000_000_000) ?? 0,
    pricesIncludeVat: r.pricesIncludeVat === true,
    extraHourPrice: int(r.extraHourPrice),
    depositAmount: int(r.depositAmount),
    paymentTerms: str(r.paymentTerms),
    validUntil: dateStr(r.validUntil),
    clientNotes: str(r.clientNotes, 5000),
    internalNotes: str(r.internalNotes, 5000),
    niroFeatures: (Array.isArray(r.niroFeatures) ? r.niroFeatures : []).slice(0, 20)
      .map((f: Record<string, unknown>) => ({ title: str(f?.title, 200), description: str(f?.description, 500) }))
      .filter((f) => f.title),
    gift: str(r.gift, 200),
  };
}

export function quoteTotals(d: QuoteDraft, vatType: VatType, vatRate: number) {
  return computeQuote({
    priceMode: d.priceMode,
    packagePrice: d.packagePrice,
    tiers: d.tiers,
    guestCount: d.guestCount,
    items: d.items,
    discountType: d.discountType,
    discountValue: d.discountValue,
    vatType,
    vatRate,
    pricesIncludeVat: d.pricesIncludeVat,
  });
}

/** Problems that block sending a quote (and generating the NIRO BAR design). */
export function validateQuoteForSend(d: QuoteDraft, total: number): string[] {
  const errors: string[] = [];
  if (!d.customerId) errors.push('יש לבחור לקוח');
  if (total <= 0) errors.push('סכום ההצעה חייב להיות גדול מ-0');
  if (d.template === 'NIRO_BAR') {
    if (!d.serviceType) errors.push('חסר סוג אירוע');
    if (!d.eventDate) errors.push('חסר תאריך אירוע');
    if (!d.location) errors.push('חסר מיקום');
    if (!d.guestCount) errors.push('חסרה כמות אורחים');
    if (d.niroFeatures.length === 0) errors.push('יש לבחור לפחות סעיף אחד ב"מה מחכה לכם?"');
  }
  return errors;
}

/** "2026-09-12" → "12.9.2026" (the format the NIRO BAR flyer always used). */
export function formatEventDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])}.${Number(m[2])}.${m[1]}` : '';
}

/** Fill the (unchanged) NIRO BAR flyer template from the structured quote. */
export function quoteToNiroFields(d: QuoteDraft, customerName: string, total: number): NiroBarQuoteFields {
  const perPerson = d.priceMode === 'PER_PERSON';
  return {
    clientName: customerName,
    clientRole: d.clientRole,
    eventType: d.serviceType,
    eventDate: formatEventDate(d.eventDate),
    eventLocation: d.location,
    guestCount: d.guestCount ? String(d.guestCount) : '',
    features: d.niroFeatures,
    gift: d.gift,
    priceMode: perPerson ? 'perPerson' : 'total',
    tiers: perPerson
      ? d.tiers.filter((t) => t.price > 0).map((t) => ({
          min: t.min ? String(t.min) : '',
          max: t.max ? String(t.max) : '',
          price: formatAmount(t.price),
        }))
      : undefined,
    totalPrice: perPerson ? undefined : formatAmount(total),
    extraHourPrice: d.extraHourPrice ? formatAmount(d.extraHourPrice) : '',
  };
}

export { tierLabel };
