import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { allocateNumber } from '@/lib/documents';
import { logAudit } from '@/lib/audit';
import { getBusinessProfile } from '@/lib/business';
import { emptyQuoteDraft, QUOTE_STATUSES, type QuoteTemplate } from '@/lib/quotes';
import { draftToColumns, expireQuotes, newShareToken, paidByQuote, quoteLabel, quoteToDraft } from '@/lib/quotes-server';

/** GET /api/quotes?q=&status=&customerId= */
export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;
  await expireQuotes();

  const sp = req.nextUrl.searchParams;
  const q = sp.get('q')?.trim();
  const status = sp.get('status');
  const customerId = sp.get('customerId');

  const where: Prisma.QuoteWhereInput = {};
  if (customerId) where.customerId = customerId;
  if (status && (QUOTE_STATUSES as readonly string[]).includes(status)) where.status = status;
  if (q) {
    const n = Number(q.replace(/\D/g, ''));
    where.OR = [
      { customer: { name: { contains: q, mode: 'insensitive' } } },
      { title: { contains: q, mode: 'insensitive' } },
      { serviceType: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
      ...(n ? [{ number: n }] : []),
    ];
  }

  const quotes = await prisma.quote.findMany({
    where,
    orderBy: [{ number: 'desc' }, { version: 'desc' }],
    take: 300,
    select: {
      id: true, number: true, version: true, status: true, template: true, title: true, serviceType: true,
      eventDate: true, total: true, createdAt: true, updatedAt: true, validUntil: true,
      customer: { select: { id: true, name: true } },
    },
  });
  const paid = await paidByQuote(quotes.map((x) => x.id));
  return NextResponse.json({ success: true, data: quotes.map((x) => ({ ...x, paid: paid.get(x.id) ?? 0 })) });
}

interface CreateBody {
  customerId?: string;
  template?: QuoteTemplate;
  /** Copy an existing quote */
  fromQuoteId?: string;
  /** duplicate = new number; version = same number, next version */
  mode?: 'duplicate' | 'version';
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;
  const body = await req.json() as CreateBody;

  let draft;
  let source: Awaited<ReturnType<typeof prisma.quote.findUnique>> = null;
  if (body.fromQuoteId) {
    const src = await prisma.quote.findUnique({ where: { id: body.fromQuoteId }, include: { items: true } });
    if (!src) return NextResponse.json({ success: false, error: 'ההצעה לא נמצאה' }, { status: 404 });
    source = src;
    draft = quoteToDraft(src);
    if (body.mode === 'duplicate') draft.validUntil = '';
  } else {
    const template: QuoteTemplate = body.template === 'NIRO_BAR' ? 'NIRO_BAR' : 'GENERAL';
    draft = emptyQuoteDraft(body.customerId ?? '', template);
    draft.paymentTerms = (await getBusinessProfile()).defaultPaymentTerms;
  }
  if (!draft.customerId || !(await prisma.customer.findUnique({ where: { id: draft.customerId }, select: { id: true } }))) {
    return NextResponse.json({ success: false, error: 'יש לבחור לקוח' }, { status: 400 });
  }

  const { data, items } = await draftToColumns(draft);
  const quote = await prisma.$transaction(async (tx) => {
    let number: number;
    let version = 1;
    let parentQuoteId: string | null = null;
    if (source && body.mode === 'version') {
      number = source.number;
      const latest = await tx.quote.aggregate({ where: { number }, _max: { version: true } });
      version = (latest._max.version ?? 1) + 1;
      parentQuoteId = source.id;
    } else {
      number = await allocateNumber(tx, 'quote');
    }
    const created = await tx.quote.create({
      data: {
        ...data, number, version, parentQuoteId, status: 'DRAFT', shareToken: newShareToken(), createdById: user.id,
        items: { create: items },
      },
    });
    const summary = source
      ? body.mode === 'version'
        ? `נוצרה גרסה ${version} להצעת מחיר ${number}`
        : `הצעת מחיר ${quoteLabel(source)} שוכפלה להצעה ${number}`
      : `נוצרה טיוטת הצעת מחיר ${number}`;
    await logAudit({ userId: user.id, action: 'quote.created', entityType: 'quote', entityId: created.id, customerId: created.customerId, summary }, tx);
    return created;
  });

  return NextResponse.json({ success: true, data: { id: quote.id, number: quote.number, version: quote.version } }, { status: 201 });
}
