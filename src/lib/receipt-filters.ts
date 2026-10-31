import type { Prisma } from '@prisma/client';
import { PAYMENT_METHODS } from './receipt-rules';

/** Shared list/export filters: q (number/customer/description), from, to (yyyy-mm-dd), method, customerId, quoteId. */
export function receiptFilters(sp: URLSearchParams): Prisma.ReceiptWhereInput {
  const where: Prisma.ReceiptWhereInput = {};
  const q = sp.get('q')?.trim();
  const from = sp.get('from');
  const to = sp.get('to');
  const method = sp.get('method');
  if (sp.get('customerId')) where.customerId = sp.get('customerId')!;
  if (sp.get('quoteId')) where.quoteId = sp.get('quoteId')!;
  if (q) {
    const n = Number(q.replace(/\D/g, ''));
    where.OR = [
      { customer: { name: { contains: q, mode: 'insensitive' } } },
      { description: { contains: q, mode: 'insensitive' } },
      ...(n ? [{ number: n }] : []),
    ];
  }
  // Filter by the receipt's date (payment date), which is a plain calendar date.
  if (from || to) {
    where.documentDate = {
      ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
      ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}),
    };
  }
  if (method && (PAYMENT_METHODS as readonly string[]).includes(method)) where.payments = { some: { method } };
  return where;
}
