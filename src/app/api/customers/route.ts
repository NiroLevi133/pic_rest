import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { validateCustomer, CUSTOMER_STATUSES } from '@/lib/customers';
import { logAudit } from '@/lib/audit';

/** GET /api/customers?q=&status=&limit= */
export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const q = sp.get('q')?.trim();
  const status = sp.get('status');
  const limit = Math.min(Number(sp.get('limit')) || 500, 500);

  const where: Prisma.CustomerWhereInput = {};
  if (q) {
    const digits = q.replace(/\D/g, '');
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      ...(digits.length >= 3 ? [{ phone: { contains: digits } }, { taxId: { contains: digits } }] : []),
    ];
  }
  if (status && (CUSTOMER_STATUSES as readonly string[]).includes(status)) where.status = status;

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: { id: true, name: true, phone: true, email: true, status: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ success: true, data: customers.map((c) => ({ ...c, quoteCount: 0 })) });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const result = validateCustomer(await req.json());
  if (!result.ok) return NextResponse.json({ success: false, error: 'יש לתקן את השדות המסומנים', fields: result.errors }, { status: 400 });

  const customer = await prisma.$transaction(async (tx) => {
    const c = await tx.customer.create({ data: { ...(result.value as Required<typeof result.value>), createdById: user.id } });
    await logAudit({
      userId: user.id, action: 'customer.created', entityType: 'customer', entityId: c.id, customerId: c.id,
      summary: `לקוח חדש נוצר: ${c.name}`,
    }, tx);
    return c;
  });

  return NextResponse.json({ success: true, data: customer }, { status: 201 });
}
