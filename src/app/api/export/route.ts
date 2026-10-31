import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { israelToday } from '@/lib/dates';

/** Full business data export (backup / accountant). Images are listed by URL, not embedded. */
export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, ['OWNER']);
  if (error) return error;

  const [business, counters, customers, quotes, receipts, payments, auditLog, media] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { id: 'main' } }),
    prisma.documentCounter.findMany(),
    prisma.customer.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.quote.findMany({ orderBy: [{ number: 'asc' }, { version: 'asc' }], include: { items: true } }),
    prisma.receipt.findMany({ orderBy: { number: 'asc' } }),
    prisma.payment.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.mediaAsset.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, kind: true, title: true, styleKey: true, customerId: true, createdAt: true, url: true },
    }),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    business, counters, customers, quotes, receipts, payments, auditLog,
    // data: URLs are omitted to keep the file small
    media: media.map((m) => ({ ...m, url: m.url.startsWith('data:') ? null : m.url })),
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="niro-workspace-${israelToday()}.json"`,
    },
  });
}
