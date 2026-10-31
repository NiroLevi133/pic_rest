import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import type { Prisma, Quote, QuoteItem } from '@prisma/client';
import { prisma } from './prisma';
import { docBusiness, getBusinessProfile } from './business';
import { quoteTotals, type QuoteDraft, type QuoteTemplate, type NiroFeature } from './quotes';
import type { PriceTier, VatType } from './quote-math';

export function newShareToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

/** Public base URL for share links. */
export function publicBaseUrl(req: NextRequest): string {
  return (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, '');
}

/** wa.me link; the phone is optional (then WhatsApp asks whom to send to). */
export function whatsappUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

const toDateStr = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');
const toDate = (s: string) => (s ? new Date(`${s}T00:00:00.000Z`) : null);

export function quoteToDraft(q: Quote & { items: QuoteItem[] }): QuoteDraft {
  return {
    customerId: q.customerId,
    template: q.template as QuoteTemplate,
    title: q.title,
    serviceType: q.serviceType,
    clientRole: q.clientRole,
    eventDate: toDateStr(q.eventDate),
    location: q.location,
    guestCount: q.guestCount,
    priceMode: q.priceMode as QuoteDraft['priceMode'],
    packagePrice: q.packagePrice,
    tiers: (q.tiers as unknown as PriceTier[]) ?? [],
    items: [...q.items].sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
    discountType: q.discountType as QuoteDraft['discountType'],
    discountValue: q.discountValue,
    pricesIncludeVat: q.pricesIncludeVat,
    extraHourPrice: q.extraHourPrice,
    depositAmount: q.depositAmount,
    paymentTerms: q.paymentTerms,
    validUntil: toDateStr(q.validUntil),
    clientNotes: q.clientNotes,
    internalNotes: q.internalNotes,
    niroFeatures: (q.niroFeatures as unknown as NiroFeature[]) ?? [],
    gift: q.gift,
  };
}

/** Column values for a draft, with totals recomputed on the server (never trusted from the client). */
export async function draftToColumns(d: QuoteDraft) {
  const business = await getBusinessProfile();
  const t = quoteTotals(d, business.vatType as VatType, business.vatRate);
  const data = {
    customerId: d.customerId,
    template: d.template,
    title: d.title,
    serviceType: d.serviceType,
    clientRole: d.clientRole,
    eventDate: toDate(d.eventDate),
    location: d.location,
    guestCount: d.guestCount,
    priceMode: d.priceMode,
    packagePrice: d.packagePrice,
    tiers: d.tiers as unknown as Prisma.InputJsonValue,
    discountType: d.discountType,
    discountValue: d.discountValue,
    pricesIncludeVat: d.pricesIncludeVat,
    extraHourPrice: d.extraHourPrice,
    depositAmount: d.depositAmount,
    paymentTerms: d.paymentTerms,
    validUntil: toDate(d.validUntil),
    clientNotes: d.clientNotes,
    internalNotes: d.internalNotes,
    niroFeatures: d.niroFeatures as unknown as Prisma.InputJsonValue,
    gift: d.gift,
    subtotal: t.subtotal,
    discountAmount: t.discountAmount,
    vatRate: t.vatRate,
    vatAmount: t.vatAmount,
    total: t.total,
  };
  const items = d.items
    .filter((i) => i.description || i.unitPrice)
    .map((i, idx) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, sortOrder: idx }));
  return { data, items, totals: t };
}

/** Sum of payments on non-cancelled receipts, per quote. */
export async function paidByQuote(quoteIds: string[]): Promise<Map<string, number>> {
  if (quoteIds.length === 0) return new Map();
  const rows = await prisma.payment.groupBy({
    by: ['quoteId'],
    where: { quoteId: { in: quoteIds }, receipt: { status: 'ISSUED', type: 'RECEIPT' } },
    _sum: { amount: true },
  });
  return new Map(rows.map((r) => [r.quoteId!, r._sum.amount ?? 0]));
}

let lastExpiryCheck = 0;

/** SENT quotes past their validity date become EXPIRED. Runs at most once a minute per instance. */
export async function expireQuotes(): Promise<void> {
  if (Date.now() - lastExpiryCheck < 60_000) return;
  lastExpiryCheck = Date.now();
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
  await prisma.quote.updateMany({ where: { status: 'SENT', validUntil: { lt: today } }, data: { status: 'EXPIRED' } });
}

export function quoteLabel(q: Pick<Quote, 'number' | 'version'>): string {
  return q.version > 1 ? `${q.number} (גרסה ${q.version})` : String(q.number);
}

/** Everything the quote document needs, from a quote with items + customer. */
export async function quoteDocData(q: Quote & { items: QuoteItem[]; customer: { name: string; phone: string; email: string; address: string; taxId: string } }) {
  return {
    business: docBusiness(await getBusinessProfile()),
    number: q.number,
    version: q.version,
    createdAt: (q.sentAt ?? q.createdAt).toISOString(),
    customer: { name: q.customer.name, phone: q.customer.phone, email: q.customer.email, address: q.customer.address, taxId: q.customer.taxId },
    draft: quoteToDraft(q),
    totals: { subtotal: q.subtotal, discountAmount: q.discountAmount, vatRate: q.vatRate, vatAmount: q.vatAmount, total: q.total },
  };
}
