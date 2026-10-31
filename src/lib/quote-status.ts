import { prisma } from './prisma';
import { logAudit } from './audit';
import { QUOTE_TRANSITIONS, validateQuoteForSend, type QuoteStatus } from './quotes';
import { quoteLabel, quoteToDraft } from './quotes-server';
import { statusLabelHe } from './status-labels';

type Result = { ok: true } | { ok: false; error: string; issues?: string[]; httpStatus: number };

/** Apply a manual status change, with side effects on the customer status. */
export async function statusChange(id: string, to: QuoteStatus, userId: string): Promise<Result> {
  const quote = await prisma.quote.findUnique({ where: { id }, include: { items: true, customer: true } });
  if (!quote) return { ok: false, error: 'ההצעה לא נמצאה', httpStatus: 404 };
  const from = quote.status as QuoteStatus;
  if (from === to) return { ok: true };
  if (!QUOTE_TRANSITIONS[from]?.includes(to)) {
    return { ok: false, error: `אי אפשר לשנות סטטוס מ"${statusLabelHe(from)}" ל"${statusLabelHe(to)}"`, httpStatus: 409 };
  }
  if (to === 'SENT') {
    const issues = validateQuoteForSend(quoteToDraft(quote), quote.total);
    if (issues.length > 0) return { ok: false, error: 'ההצעה לא מוכנה לשליחה', issues, httpStatus: 400 };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id },
      data: {
        status: to,
        ...(to === 'SENT' ? { sentAt: now } : {}),
        ...(to === 'APPROVED' ? { approvedAt: now } : {}),
        ...(to === 'REJECTED' ? { rejectedAt: now } : {}),
      },
    });
    if (to === 'SENT' && quote.customer.status === 'LEAD') {
      await tx.customer.update({ where: { id: quote.customerId }, data: { status: 'QUOTE_SENT' } });
    }
    if (to === 'APPROVED' && quote.customer.status !== 'ACTIVE') {
      await tx.customer.update({ where: { id: quote.customerId }, data: { status: 'ACTIVE' } });
    }
    await logAudit({
      userId, action: `quote.${to.toLowerCase()}`, entityType: 'quote', entityId: id, customerId: quote.customerId,
      summary: `הצעת מחיר ${quoteLabel(quote)}: ${statusLabelHe(to)}`,
    }, tx);
  });
  return { ok: true };
}
