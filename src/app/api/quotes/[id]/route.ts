import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getBusinessProfile } from '@/lib/business';
import { normalizeQuoteDraft, validateQuoteForSend } from '@/lib/quotes';
import { draftToColumns, expireQuotes, paidByQuote, quoteToDraft } from '@/lib/quotes-server';
import { balanceDue } from '@/lib/quote-math';

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;
  await expireQuotes();

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      customer: { select: { id: true, name: true, phone: true, email: true, address: true, taxId: true } },
      receipts: {
        orderBy: { number: 'desc' },
        select: { id: true, number: true, type: true, status: true, total: true, issuedAt: true, documentDate: true },
      },
    },
  });
  if (!quote) return NextResponse.json({ success: false, error: 'ההצעה לא נמצאה' }, { status: 404 });

  const [paidMap, versions, design, business] = await Promise.all([
    paidByQuote([quote.id]),
    prisma.quote.findMany({ where: { number: quote.number }, orderBy: { version: 'asc' }, select: { id: true, version: true, status: true, total: true, createdAt: true } }),
    quote.designAssetId ? prisma.mediaAsset.findUnique({ where: { id: quote.designAssetId }, select: { id: true, deletedAt: true } }) : null,
    getBusinessProfile(),
  ]);
  const paid = paidMap.get(quote.id) ?? 0;
  const draft = quoteToDraft(quote);

  return NextResponse.json({
    success: true,
    data: {
      id: quote.id,
      number: quote.number,
      version: quote.version,
      status: quote.status,
      shareToken: quote.shareToken,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
      sentAt: quote.sentAt,
      approvedAt: quote.approvedAt,
      customer: quote.customer,
      draft,
      totals: { subtotal: quote.subtotal, discountAmount: quote.discountAmount, vatRate: quote.vatRate, vatAmount: quote.vatAmount, total: quote.total },
      paid,
      balance: balanceDue(quote.total, paid),
      receipts: quote.receipts,
      versions,
      designAssetId: design && !design.deletedAt ? design.id : null,
      sendIssues: validateQuoteForSend(draft, quote.total),
      vat: { type: business.vatType, rate: business.vatRate },
    },
  });
}

/** Autosave — drafts only. Totals are recomputed here; client totals are ignored. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const existing = await prisma.quote.findUnique({ where: { id: params.id }, select: { status: true, customerId: true } });
  if (!existing) return NextResponse.json({ success: false, error: 'ההצעה לא נמצאה' }, { status: 404 });
  if (existing.status !== 'DRAFT') {
    return NextResponse.json({ success: false, error: 'ניתן לערוך רק טיוטה. ליצירת שינוי — צור גרסה מעודכנת.' }, { status: 409 });
  }

  const draft = normalizeQuoteDraft(await req.json());
  if (draft.customerId !== existing.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: draft.customerId }, select: { id: true } });
    if (!customer) return NextResponse.json({ success: false, error: 'הלקוח לא נמצא' }, { status: 400 });
  }

  const { data, items, totals } = await draftToColumns(draft);
  await prisma.$transaction([
    prisma.quoteItem.deleteMany({ where: { quoteId: params.id } }),
    prisma.quote.update({ where: { id: params.id }, data: { ...data, items: { create: items } } }),
  ]);

  return NextResponse.json({ success: true, data: { totals, sendIssues: validateQuoteForSend(draft, totals.total) } });
}

/** Delete a draft that has no payments. Sent quotes are kept for history. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const quote = await prisma.quote.findUnique({ where: { id: params.id }, include: { _count: { select: { payments: true, receipts: true } } } });
  if (!quote) return NextResponse.json({ success: false, error: 'ההצעה לא נמצאה' }, { status: 404 });
  if (quote.status !== 'DRAFT' || quote._count.payments > 0 || quote._count.receipts > 0) {
    return NextResponse.json({ success: false, error: 'ניתן למחוק רק טיוטה שלא נרשמו עליה תשלומים' }, { status: 409 });
  }
  await prisma.$transaction(async (tx) => {
    await tx.quote.delete({ where: { id: quote.id } });
    await logAudit({
      userId: user.id, action: 'quote.deleted', entityType: 'quote', entityId: quote.id, customerId: quote.customerId,
      summary: `טיוטת הצעת מחיר ${quote.number} נמחקה`,
    }, tx);
  });
  return NextResponse.json({ success: true });
}
