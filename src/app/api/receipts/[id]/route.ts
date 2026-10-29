import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { opt, serializeReceipt } from '@/lib/receipts';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const receipt = await prisma.receipt.findFirst({ where: { id: params.id, userId } });
  if (!receipt) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: serializeReceipt(receipt) });
}

/** Receipts are never edited or deleted – the only allowed change is cancellation. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { action, reason } = await req.json();
    if (action !== 'cancel') return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });

    const { count } = await prisma.receipt.updateMany({
      where: { id: params.id, userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelReason: opt(reason), cancelledAt: new Date() },
    });
    if (!count) return NextResponse.json({ success: false, error: 'הקבלה לא נמצאה או כבר בוטלה' }, { status: 404 });

    const receipt = await prisma.receipt.findUniqueOrThrow({ where: { id: params.id } });
    return NextResponse.json({ success: true, data: serializeReceipt(receipt) });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
