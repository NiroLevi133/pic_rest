import { NextRequest, NextResponse } from 'next/server';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { cancelReceipt, ReceiptError } from '@/lib/receipts';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;
  const { reason } = await req.json() as { reason?: string };
  try {
    const doc = await cancelReceipt(params.id, reason ?? '', user.id);
    return NextResponse.json({ success: true, data: { id: doc.id, number: doc.number } });
  } catch (err) {
    if (err instanceof ReceiptError) return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    console.error('[receipts] cancel failed', err);
    return NextResponse.json({ success: false, error: 'הביטול נכשל' }, { status: 500 });
  }
}
