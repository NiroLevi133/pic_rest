import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { verifyReceipt } from '@/lib/receipts';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const r = await prisma.receipt.findUnique({
    where: { id: params.id },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      quote: { select: { id: true, number: true, version: true } },
      cancelledBy: { select: { id: true, number: true, issuedAt: true } },
      cancels: { select: { id: true, number: true } },
    },
  });
  if (!r) return NextResponse.json({ success: false, error: 'הקבלה לא נמצאה' }, { status: 404 });

  return NextResponse.json({
    success: true,
    data: {
      id: r.id, number: r.number, type: r.type, status: r.status, issuedAt: r.issuedAt, total: r.total,
      snapshot: r.snapshot, printCount: r.printCount, originalChannel: r.originalChannel,
      customer: r.customer, quote: r.quote, cancelledBy: r.cancelledBy, cancels: r.cancels, cancelReason: r.cancelReason,
      integrityOk: verifyReceipt(r),
    },
  });
}

const immutable = () =>
  NextResponse.json({ success: false, error: 'קבלה שהופקה אינה ניתנת לעריכה או למחיקה. לביטול — הפק מסמך ביטול.' }, { status: 405 });
export const PUT = immutable;
export const PATCH = immutable;
export const DELETE = immutable;
