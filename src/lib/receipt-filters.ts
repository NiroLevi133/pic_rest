import type { Prisma } from '@prisma/client';
import { PAYMENT_METHODS } from './receipt-rules';
import { israelDayBoundary } from './dates';

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
  if (from || to) {
    where.issuedAt = {
      ...(from ? { gte: israelDayBoundary(from) } : {}),
      ...(to ? { lte: israelDayBoundary(to, true) } : {}),
    };
  }
  if (method && (PAYMENT_METHODS as readonly string[]).includes(method)) where.payments = { some: { method } };
  return where;
}
