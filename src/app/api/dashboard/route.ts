import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { israelDayBoundary, israelToday } from '@/lib/dates';
import { expireQuotes } from '@/lib/quotes-server';

/** Home screen numbers. Income = net of receipts (cancellations are negative). */
export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;
  await expireQuotes();

  const today = israelToday();
  const monthStart = israelDayBoundary(`${today.slice(0, 7)}-01`);
  const todayStart = new Date(`${today}T00:00:00.000Z`);
  // Income counts by the receipt date (= payment date)
  const monthStartDay = `${today.slice(0, 7)}-01`;
  const yearStartDay = `${today.slice(0, 4)}-01-01`;

  // All the numbers in one round trip (each trip to the DB costs ~200ms).
  const metricsQuery = prisma.$queryRaw<{
    income_month: bigint | null; income_year: bigint | null; sent_count: bigint; sent_total: bigint | null;
    outstanding: bigint | null; customers_active: bigint; customers_new: bigint; images_month: bigint;
  }[]>`
    SELECT
      (SELECT SUM("total") FROM "Receipt" WHERE "documentDate" >= ${monthStartDay}::date) AS income_month,
      (SELECT SUM("total") FROM "Receipt" WHERE "documentDate" >= ${yearStartDay}::date)  AS income_year,
      (SELECT COUNT(*) FROM "Quote" WHERE "status" = 'SENT')                 AS sent_count,
      (SELECT SUM("total") FROM "Quote" WHERE "status" = 'SENT')             AS sent_total,
      (SELECT SUM(GREATEST(q."total" - COALESCE((
          SELECT SUM(p."amount") FROM "Payment" p JOIN "Receipt" r ON r."id" = p."receiptId"
          WHERE p."quoteId" = q."id" AND r."status" = 'ISSUED' AND r."type" = 'RECEIPT'), 0), 0))
        FROM "Quote" q WHERE q."status" = 'APPROVED')                        AS outstanding,
      (SELECT COUNT(*) FROM "Customer" WHERE "status" <> 'INACTIVE')         AS customers_active,
      (SELECT COUNT(*) FROM "Customer" WHERE "createdAt" >= ${monthStart})   AS customers_new,
      (SELECT COUNT(*) FROM "MediaAsset" WHERE "createdAt" >= ${monthStart} AND "deletedAt" IS NULL) AS images_month`;

  const [[m], upcoming, activity] = await Promise.all([
    metricsQuery,
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
  const n = (v: bigint | null) => Number(v ?? 0);

  return NextResponse.json({
    success: true,
    data: {
      incomeMonth: n(m.income_month),
      incomeYear: n(m.income_year),
      openQuotes: { count: n(m.sent_count), total: n(m.sent_total) },
      outstanding: n(m.outstanding),
      customers: { active: n(m.customers_active), newThisMonth: n(m.customers_new) },
      imagesMonth: n(m.images_month),
      upcoming,
      activity,
    },
  });
}
