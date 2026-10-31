import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { validateCustomer, diffFields, CUSTOMER_FIELD_LABELS, type CustomerInput } from '@/lib/customers';
import { statusLabel } from '@/components/ui/StatusBadge';
import { logAudit } from '@/lib/audit';
import { paidByQuote } from '@/lib/quotes-server';
import { balanceDue } from '@/lib/quote-math';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: { _count: { select: { mediaAssets: { where: { deletedAt: null } } } } },
  });
  if (!customer) return NextResponse.json({ success: false, error: 'הלקוח לא נמצא' }, { status: 404 });

  const [approved, paidAll, quoteCount] = await Promise.all([
    prisma.quote.findMany({ where: { customerId: customer.id, status: 'APPROVED' }, select: { id: true, total: true } }),
    prisma.receipt.aggregate({ where: { customerId: customer.id, type: 'RECEIPT', status: 'ISSUED' }, _sum: { total: true } }),
    prisma.quote.count({ where: { customerId: customer.id } }),
  ]);
  const paidMap = await paidByQuote(approved.map((q) => q.id));
  const finance = {
    approvedTotal: approved.reduce((s, q) => s + q.total, 0),
    paid: paidAll._sum.total ?? 0,
    balance: approved.reduce((s, q) => s + balanceDue(q.total, paidMap.get(q.id) ?? 0), 0),
  };

  const { _count, ...rest } = customer;
  return NextResponse.json({ success: true, data: { ...rest, mediaCount: _count.mediaAssets, quoteCount, finance } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const before = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ success: false, error: 'הלקוח לא נמצא' }, { status: 404 });

  const result = validateCustomer(await req.json(), true);
  if (!result.ok) return NextResponse.json({ success: false, error: 'יש לתקן את השדות המסומנים', fields: result.errors }, { status: 400 });

  const changes = diffFields(before as unknown as CustomerInput, result.value);
  const changedKeys = Object.keys(changes) as (keyof CustomerInput)[];
  if (changedKeys.length === 0) return NextResponse.json({ success: true, data: before });

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.customer.update({ where: { id: params.id }, data: result.value });
    const summary = changes.status && changedKeys.length === 1
      ? `סטטוס שונה ל"${statusLabel(String(changes.status.to))}"`
      : `פרטים עודכנו: ${changedKeys.map((k) => CUSTOMER_FIELD_LABELS[k]).join(', ')}`;
    await logAudit({
      userId: user.id, action: 'customer.updated', entityType: 'customer', entityId: c.id, customerId: c.id,
      summary, data: JSON.parse(JSON.stringify(changes)),
    }, tx);
    return c;
  });

  return NextResponse.json({ success: true, data: updated });
}
