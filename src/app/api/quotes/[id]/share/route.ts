import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { getBusinessProfile } from '@/lib/business';
import { statusChange } from '@/lib/quote-status';
import { publicBaseUrl, whatsappUrl } from '@/lib/quotes-server';
import { logAudit } from '@/lib/audit';

/** Share link + WhatsApp message. Sharing a draft marks it as sent. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const quote = await prisma.quote.findUnique({ where: { id: params.id }, include: { customer: true } });
  if (!quote) return NextResponse.json({ success: false, error: 'ההצעה לא נמצאה' }, { status: 404 });

  if (quote.status === 'DRAFT') {
    const result = await statusChange(quote.id, 'SENT', user.id);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error, issues: result.issues }, { status: result.httpStatus });
  }

  const business = await getBusinessProfile();
  const url = `${publicBaseUrl(req)}/d/q/${quote.shareToken}`;
  const firstName = quote.customer.name.split(' ')[0];
  const text = `היי ${firstName}, מצרף את הצעת המחיר${business.businessName ? ` מ-${business.businessName}` : ''}:\n${url}`;
  await logAudit({
    userId: user.id, action: 'quote.shared', entityType: 'quote', entityId: quote.id, customerId: quote.customerId,
    summary: `קישור להצעת מחיר ${quote.number} נוצר לשיתוף`,
  });
  return NextResponse.json({ success: true, data: { url, whatsapp: whatsappUrl(quote.customer.phone, text) } });
}
