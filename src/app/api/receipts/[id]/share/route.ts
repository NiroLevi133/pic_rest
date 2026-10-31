import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { claimOriginal } from '@/lib/receipts';
import { publicBaseUrl, whatsappUrl } from '@/lib/quotes-server';
import { logAudit } from '@/lib/audit';
import { formatILS } from '@/lib/money';

/** Digital delivery to the payer. If nothing was printed yet, the shared document is the "מקור". */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const r = await prisma.receipt.findUnique({ where: { id: params.id }, include: { customer: true } });
  if (!r) return NextResponse.json({ success: false, error: 'הקבלה לא נמצאה' }, { status: 404 });

  await claimOriginal(r.id, 'SHARE');
  const url = `${publicBaseUrl(req)}/d/r/${r.shareToken}`;
  const label = r.type === 'CANCELLATION' ? 'מסמך ביטול' : 'קבלה';
  const text = `היי ${r.customer.name.split(' ')[0]}, מצרף ${label} מס' ${r.number} על סך ${formatILS(Math.abs(r.total))}:\n${url}`;
  await logAudit({
    userId: user.id, action: 'receipt.shared', entityType: 'receipt', entityId: r.id, customerId: r.customerId,
    summary: `קישור ל${label} ${r.number} נוצר לשליחה`,
  });
  return NextResponse.json({ success: true, data: { url, whatsapp: whatsappUrl(r.customer.phone, text) } });
}
