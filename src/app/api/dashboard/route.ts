import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { israelDayBoundary, israelToday } from '@/lib/dates';
import { expireQuotes, paidByQuote } from '@/lib/quotes-server';
import { balanceDue } from '@/lib/quote-math';

/** Home screen numbers. Income = net of receipts (cancellations are negative). */
export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;
  await expireQuotes();

  const today = israelToday();
  const monthStart = israelDayBoundary(`${today.slice(0, 7)}-01`);
  const yearStart = israelDayBoundary(`${today.slice(0, 4)}-01-01`);
  const todayStart = new Date(`${today}T00:00:00.000Z`);

  const [incomeMonth, incomeYear, sent, approved, customers, newCustomers, imagesMonth, upcoming, activity] = await Promise.all([
    prisma.receipt.aggregate({ where: { issuedAt: { gte: monthStart } }, _sum: { total: true } }),
    prisma.receipt.aggregate({ where: { issuedAt: { gte: yearStart } }, _sum: { total: true } }),
    prisma.quote.aggregate({ where: { status: 'SENT' }, _count: true, _sum: { total: true } }),
    prisma.quote.findMany({ where: { status: 'APPROVED' }, select: { id: true, total: true } }),
    prisma.customer.count({ where: { status: { not: 'INACTIVE' } } }),
    prisma.customer.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.mediaAsset.count({ where: { createdAt: { gte: monthStart }, deletedAt: null } }),
    prisma.quote.findMany({
      where: { status: { in: ['APPROVED', 'SENT'] }, eventDate: { gte: todayStart } },
      orderBy: { eventDate: 'asc' },
      take: 5,
      select: { id: true, number: true, status: true, serviceType: true, title: true, eventDate: true, location: true, total: true, customer: { select: { name: true } } },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { id: true, action: true, entityType: true, entityId: true, customerId: true, summary: true, createdAt: true },
    }),
  ]);

  const paid = await paidByQuote(approved.map((q) => q.id));
  const outstanding = approved.reduce((s, q) => s + balanceDue(q.total, paid.get(q.id) ?? 0), 0);

  return NextResponse.json({
    success: true,
    data: {
      incomeMonth: incomeMonth._sum.total ?? 0,
      incomeYear: incomeYear._sum.total ?? 0,
      openQuotes: { count: sent._count, total: sent._sum.total ?? 0 },
      outstanding,
      customers: { active: customers, newThisMonth: newCustomers },
      imagesMonth,
      upcoming,
      activity,
    },
  });
}
