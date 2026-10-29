import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { PAYMENT_METHODS, normalizePhone, opt, serializeReceipt } from '@/lib/receipts';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
    const customerId = req.nextUrl.searchParams.get('customerId');
    const where: Prisma.ReceiptWhereInput = { userId };
    if (customerId) where.customerId = customerId;
    if (q) {
      const digits = normalizePhone(q);
      where.OR = [
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerCompany: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        ...(digits ? [{ customerPhone: { contains: digits } }] : []),
        ...(/^\d+$/.test(q) ? [{ number: Number(q) }] : []),
      ];
    }

    const receipts = await prisma.receipt.findMany({ where, orderBy: { number: 'desc' }, take: 200 });
    return NextResponse.json({ success: true, data: receipts.map(serializeReceipt) });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

/**
 * Issue a receipt. The customer is found by phone (or created) on the fly –
 * there is no separate "add customer" step.
 */
export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const fullName = opt(body.fullName);
    const phone = normalizePhone(String(body.phone ?? ''));
    const amount = Math.round(Number(body.amount) * 100) / 100;
    const paymentMethod = String(body.paymentMethod ?? '');

    if (!fullName) return NextResponse.json({ success: false, error: 'נא להזין שם מלא' }, { status: 400 });
    if (phone.length < 9) return NextResponse.json({ success: false, error: 'מספר טלפון לא תקין' }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ success: false, error: 'סכום לא תקין' }, { status: 400 });
    if (!PAYMENT_METHODS[paymentMethod]) return NextResponse.json({ success: false, error: 'אמצעי תשלום לא תקין' }, { status: 400 });

    const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();
    if (isNaN(issueDate.getTime())) return NextResponse.json({ success: false, error: 'תאריך לא תקין' }, { status: 400 });

    // Optional customer fields: only overwrite what was actually filled in
    const optional = {
      company: opt(body.company),
      taxId: opt(body.taxId),
      email: opt(body.email),
      address: opt(body.address),
    };
    const optionalUpdate = Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== null));

    const receipt = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { userId_phone: { userId, phone } },
        update: { fullName, ...optionalUpdate },
        create: { userId, phone, fullName, ...optional },
      });

      // Atomic increment = gap-free running number, safe under concurrent requests
      const issuer = await tx.user.update({
        where: { id: userId },
        data: { receiptCounter: { increment: 1 } },
      });

      return tx.receipt.create({
        data: {
          userId,
          customerId: customer.id,
          number: issuer.receiptCounter,
          issueDate,
          amount: new Prisma.Decimal(amount),
          paymentMethod,
          paymentRef: opt(body.paymentRef),
          description: opt(body.description),
          customerName: customer.fullName,
          customerPhone: customer.phone,
          customerCompany: customer.company,
          customerTaxId: customer.taxId,
          issuerName: issuer.businessName ?? issuer.restaurantName,
          issuerTaxId: issuer.businessTaxId,
          issuerAddress: issuer.businessAddress,
          issuerPhone: issuer.businessPhone ?? issuer.phone,
          issuerType: issuer.businessType,
        },
      });
    });

    return NextResponse.json({ success: true, data: serializeReceipt(receipt) });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
