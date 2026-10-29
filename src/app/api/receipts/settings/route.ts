import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { BUSINESS_TYPES, opt } from '@/lib/receipts';

const SELECT = {
  businessName: true, businessTaxId: true, businessAddress: true, businessPhone: true,
  businessType: true, receiptCounter: true, restaurantName: true, phone: true,
} as const;

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: SELECT });
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: { ...user, nextNumber: user.receiptCounter + 1 } });
}

export async function PUT(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const businessType = BUSINESS_TYPES[body.businessType] ? body.businessType : 'exempt';

    // Next number may only move forward (e.g. continuing a paper receipt book), never back
    const current = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { receiptCounter: true } });
    let receiptCounter = current.receiptCounter;
    if (body.nextNumber !== undefined && body.nextNumber !== '') {
      const next = Number(body.nextNumber);
      if (!Number.isInteger(next) || next < 1) return NextResponse.json({ success: false, error: 'מספר קבלה לא תקין' }, { status: 400 });
      if (next - 1 < current.receiptCounter) {
        return NextResponse.json({ success: false, error: `אי אפשר לחזור אחורה – המספר הבא חייב להיות לפחות ${current.receiptCounter + 1}` }, { status: 400 });
      }
      receiptCounter = next - 1;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        businessName: opt(body.businessName),
        businessTaxId: opt(body.businessTaxId),
        businessAddress: opt(body.businessAddress),
        businessPhone: opt(body.businessPhone),
        businessType,
        receiptCounter,
      },
      select: SELECT,
    });
    return NextResponse.json({ success: true, data: { ...user, nextNumber: user.receiptCounter + 1 } });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
