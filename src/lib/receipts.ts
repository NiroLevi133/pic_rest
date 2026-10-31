/**
 * Issuing and cancelling receipts. A receipt is created once, inside a single
 * transaction that also allocates its number, and is never edited afterwards
 * (a DB trigger enforces this). Cancelling creates a separate cancellation
 * document in the same number series and marks the original as CANCELLED.
 */
import crypto from 'crypto';
import type { Prisma, Receipt } from '@prisma/client';
import { prisma } from './prisma';
import { allocateNumber } from './documents';
import { getBusinessProfile } from './business';
import { logAudit } from './audit';
import { formatILS } from './money';
import { formatDay, israelToday } from './dates';
import { paidByQuote } from './quotes-server';
import { balanceDue } from './quote-math';
import {
  validateBusinessForReceipts, validateReceiptDraft, receiptTotal, PAYMENT_METHOD_LABELS,
  type FieldErrors, type ReceiptDraft,
} from './receipt-rules';
import type { ReceiptSnapshot } from './receipt-snapshot';

export class ReceiptError extends Error {
  constructor(message: string, public fields: FieldErrors = {}, public status = 400) {
    super(message);
  }
}

/** Deterministic JSON (sorted keys) so the hash survives jsonb key reordering. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function hashSnapshot(snapshot: unknown): string {
  return crypto.createHash('sha256').update(canonical(snapshot)).digest('hex');
}

export function verifyReceipt(r: Pick<Receipt, 'snapshot' | 'contentHash'>): boolean {
  return hashSnapshot(r.snapshot) === r.contentHash;
}

/** DATE column ↔ yyyy-mm-dd */
const toDay = (d: Date) => d.toISOString().slice(0, 10);
const dayToDate = (day: string) => new Date(`${day}T00:00:00.000Z`);

function newShareToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

const SOFTWARE = 'NIRO Workspace';

export async function issueReceipt(draft: ReceiptDraft, userId: string): Promise<Receipt> {
  const fieldErrors = validateReceiptDraft(draft, israelToday());
  if (Object.keys(fieldErrors).length > 0) throw new ReceiptError('יש לתקן את השדות המסומנים', fieldErrors);

  const business = await getBusinessProfile();
  const bizErrors = validateBusinessForReceipts(business);
  if (Object.keys(bizErrors).length > 0) {
    throw new ReceiptError(`פרטי העסק חסרים: ${Object.values(bizErrors).join(', ')}`, {}, 409);
  }

  const customer = await prisma.customer.findUnique({ where: { id: draft.customerId } });
  if (!customer) throw new ReceiptError('הלקוח לא נמצא', { customerId: 'הלקוח לא נמצא' });

  const total = receiptTotal(draft.payments);
  const quote = draft.quoteId ? await prisma.quote.findUnique({ where: { id: draft.quoteId } }) : null;
  if (draft.quoteId) {
    if (!quote || quote.customerId !== customer.id) throw new ReceiptError('הצעת המחיר לא שייכת ללקוח הזה');
    if (quote.status === 'DRAFT') throw new ReceiptError('אי אפשר לרשום תשלום על טיוטה — שלח קודם את ההצעה');
    if (quote.status === 'REJECTED') throw new ReceiptError('ההצעה סומנה כנדחתה');
    const paid = (await paidByQuote([quote.id])).get(quote.id) ?? 0;
    const due = balanceDue(quote.total, paid);
    if (total > due) throw new ReceiptError(`הסכום (${formatILS(total)}) גבוה מהיתרה לתשלום בהצעה (${formatILS(due)})`);
  }

  // The receipt is dated with the date the money was received (latest line if several).
  const documentDate = draft.payments.map((p) => p.receivedAt).sort().at(-1)!;

  return prisma.$transaction(async (tx) => {
    const number = await allocateNumber(tx, 'receipt');
    // Numbers follow dates: a receipt can't be dated before the latest valid receipt.
    // Cancelled receipts and cancellation documents don't count, so a mistaken
    // receipt can be cancelled and reissued with its correct date.
    // (The counter row lock above serializes issuers, so this check is race-free.)
    const last = await tx.receipt.findFirst({
      where: { type: 'RECEIPT', status: 'ISSUED' },
      orderBy: { documentDate: 'desc' },
      select: { number: true, documentDate: true },
    });
    if (last && toDay(last.documentDate) > documentDate) {
      throw new ReceiptError(
        `תאריך התשלום (${formatDay(documentDate)}) מוקדם מהקבלה האחרונה (מס' ${last.number} מתאריך ${formatDay(last.documentDate)}). ` +
        'כדי שמספרי הקבלות יישארו לפי סדר התאריכים, יש להפיק קבלות מהישנה לחדשה.',
        { 'payments.0.receivedAt': `התאריך המוקדם ביותר האפשרי: ${formatDay(last.documentDate)}` },
      );
    }
    const issuedAt = new Date();
    const snapshot: ReceiptSnapshot = {
      schema: 1,
      type: 'RECEIPT',
      number,
      issuedAt: issuedAt.toISOString(),
      documentDate,
      business: {
        name: business.businessName,
        taxId: business.taxId,
        vatType: business.vatType,
        address: business.address,
        phone: business.phone,
        email: business.email,
        logoUrl: business.logoUrl,
        footer: business.documentFooter,
      },
      payer: {
        name: draft.payer.name.trim(),
        taxId: draft.payer.taxId.replace(/\D/g, ''),
        address: draft.payer.address.trim(),
        addressExempt: !draft.payer.address.trim() && draft.payer.addressExempt,
        phone: draft.payer.phone.trim(),
        email: draft.payer.email.trim(),
      },
      description: draft.description.trim(),
      payments: draft.payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        receivedAt: p.receivedAt,
        reference: p.reference.trim(),
      })),
      total,
      notes: draft.notes.trim(),
      quote: quote ? { number: quote.number, version: quote.version } : null,
      cancels: null,
      cancelReason: '',
      computerized: true,
      software: SOFTWARE,
    };

    const receipt = await tx.receipt.create({
      data: {
        number,
        type: 'RECEIPT',
        issuedAt,
        documentDate: dayToDate(documentDate),
        customerId: customer.id,
        quoteId: quote?.id ?? null,
        total,
        description: snapshot.description,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        contentHash: hashSnapshot(snapshot),
        shareToken: newShareToken(),
        createdById: userId,
        payments: {
          create: draft.payments.map((p) => ({
            customerId: customer.id,
            quoteId: quote?.id ?? null,
            method: p.method,
            amount: p.amount,
            receivedAt: new Date(`${p.receivedAt}T00:00:00.000Z`),
            reference: p.reference.trim(),
          })),
        },
      },
    });

    // A payment on a sent quote means it was approved.
    if (quote && quote.status !== 'APPROVED') {
      await tx.quote.update({ where: { id: quote.id }, data: { status: 'APPROVED', approvedAt: new Date() } });
      await logAudit({
        userId, action: 'quote.approved', entityType: 'quote', entityId: quote.id, customerId: customer.id,
        summary: `הצעת מחיר ${quote.number} סומנה כמאושרת (התקבל תשלום)`,
      }, tx);
    }
    // Fill missing customer details from the receipt, and mark the customer active.
    const customerUpdate: Prisma.CustomerUpdateInput = {};
    if (!customer.address && snapshot.payer.address) customerUpdate.address = snapshot.payer.address;
    if (!customer.taxId && snapshot.payer.taxId) customerUpdate.taxId = snapshot.payer.taxId;
    if (customer.status === 'LEAD' || customer.status === 'QUOTE_SENT') customerUpdate.status = 'ACTIVE';
    if (Object.keys(customerUpdate).length > 0) await tx.customer.update({ where: { id: customer.id }, data: customerUpdate });

    const methods = [...new Set(draft.payments.map((p) => PAYMENT_METHOD_LABELS[p.method]))].join(', ');
    await logAudit({
      userId, action: 'receipt.issued', entityType: 'receipt', entityId: receipt.id, customerId: customer.id,
      summary: `קבלה ${number} הופקה — ${formatILS(total)} (${methods})`,
      data: { number, total, contentHash: receipt.contentHash },
    }, tx);

    return receipt;
  });
}

export async function cancelReceipt(id: string, reason: string, userId: string): Promise<Receipt> {
  if (!reason.trim()) throw new ReceiptError('יש לציין סיבת ביטול', { reason: 'שדה חובה' });

  return prisma.$transaction(async (tx) => {
    const original = await tx.receipt.findUnique({ where: { id } });
    if (!original) throw new ReceiptError('הקבלה לא נמצאה', {}, 404);
    if (original.type !== 'RECEIPT') throw new ReceiptError('אי אפשר לבטל מסמך ביטול');

    // Conditional update = row lock; a concurrent cancel finds count 0.
    const { count } = await tx.receipt.updateMany({ where: { id, status: 'ISSUED' }, data: { status: 'CANCELLED' } });
    if (count !== 1) throw new ReceiptError('הקבלה כבר בוטלה');

    const orig = original.snapshot as unknown as ReceiptSnapshot;
    const number = await allocateNumber(tx, 'receipt');
    const issuedAt = new Date();
    const documentDate = israelToday();
    const business = await tx.businessProfile.findUnique({ where: { id: 'main' } });
    const snapshot: ReceiptSnapshot = {
      ...orig,
      type: 'CANCELLATION',
      number,
      issuedAt: issuedAt.toISOString(),
      documentDate,
      business: business ? {
        name: business.businessName, taxId: business.taxId, vatType: business.vatType, address: business.address,
        phone: business.phone, email: business.email, logoUrl: business.logoUrl, footer: business.documentFooter,
      } : orig.business,
      description: `ביטול קבלה מס' ${orig.number}`,
      payments: [],
      total: -original.total,
      notes: '',
      cancels: { number: original.number, issuedAt: original.issuedAt.toISOString(), documentDate: toDay(original.documentDate), total: original.total },
      cancelReason: reason.trim(),
    };

    const doc = await tx.receipt.create({
      data: {
        number,
        type: 'CANCELLATION',
        issuedAt,
        documentDate: dayToDate(documentDate),
        customerId: original.customerId,
        quoteId: original.quoteId,
        total: -original.total,
        description: snapshot.description,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        contentHash: hashSnapshot(snapshot),
        cancelsReceiptId: original.id,
        cancelReason: reason.trim(),
        shareToken: newShareToken(),
        createdById: userId,
      },
    });

    await logAudit({
      userId, action: 'receipt.cancelled', entityType: 'receipt', entityId: original.id, customerId: original.customerId,
      summary: `קבלה ${original.number} בוטלה במסמך ביטול ${number} — ${reason.trim()}`,
      data: { cancellationId: doc.id, cancellationNumber: number },
    }, tx);

    return doc;
  });
}

/**
 * Exactly one "מקור" exists per receipt: the first print, or the first time
 * the owner shares it digitally. Returns true when this call produced the original.
 */
export async function claimOriginal(id: string, channel: 'PRINT' | 'SHARE'): Promise<boolean> {
  const { count } = await prisma.receipt.updateMany({ where: { id, originalChannel: null }, data: { originalChannel: channel } });
  return count === 1;
}
