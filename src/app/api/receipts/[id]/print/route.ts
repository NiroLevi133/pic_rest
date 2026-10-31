import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { claimOriginal } from '@/lib/receipts';
import { logAudit } from '@/lib/audit';

/**
 * Called right before the receipt is produced on paper or as a PDF file
 * (?via=pdf). The first production is the "מקור", later ones are copies.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const r = await prisma.receipt.findUnique({ where: { id: params.id }, select: { id: true, number: true, customerId: true } });
  if (!r) return NextResponse.json({ success: false, error: 'not found' }, { status: 404 });

  const viaPdf = req.nextUrl.searchParams.get('via') === 'pdf';
  const original = await claimOriginal(r.id, 'PRINT');
  await prisma.receipt.update({ where: { id: r.id }, data: { printCount: { increment: 1 } } });
  await logAudit({
    userId: user.id, action: 'receipt.printed', entityType: 'receipt', entityId: r.id, customerId: r.customerId,
    summary: `קבלה ${r.number} ${viaPdf ? 'הורדה כ-PDF' : 'הודפסה'} (${original ? 'מקור' : 'העתק'})`,
  });
  return NextResponse.json({ success: true, data: { original } });
}
