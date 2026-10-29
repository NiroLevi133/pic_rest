import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { normalizePhone } from '@/lib/receipts';

/** Customers with receipt totals. Used for the customers tab and for phone auto-fill. */
export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
    const where: Prisma.CustomerWhereInput = { userId };
    if (q) {
      const digits = normalizePhone(q);
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        ...(digits ? [{ phone: { startsWith: digits } }] : []),
      ];
    }

    const [customers, totals] = await Promise.all([
      prisma.customer.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 100 }),
      prisma.receipt.groupBy({
        by: ['customerId'],
        where: { userId, status: 'ACTIVE' },
        _sum: { amount: true },
        _count: true,
        _max: { issueDate: true },
      }),
    ]);
    const byId = new Map(totals.map((t) => [t.customerId, t]));

    const data = customers.map((c) => {
      const t = byId.get(c.id);
      return {
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        company: c.company,
        taxId: c.taxId,
        email: c.email,
        address: c.address,
        receiptCount: t?._count ?? 0,
        totalAmount: Number(t?._sum.amount ?? 0),
        lastReceiptAt: t?._max.issueDate?.toISOString() ?? null,
      };
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
