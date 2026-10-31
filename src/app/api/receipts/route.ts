import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { issueReceipt, ReceiptError } from '@/lib/receipts';
import type { ReceiptDraft } from '@/lib/receipt-rules';
import { receiptFilters } from '@/lib/receipt-filters';

/** GET /api/receipts?q=&from=&to=&method=&customerId=&quoteId= */
export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const receipts = await prisma.receipt.findMany({
    where: receiptFilters(req.nextUrl.searchParams),
    orderBy: { number: 'desc' },
    take: 500,
    select: {
      id: true, number: true, type: true, status: true, issuedAt: true, total: true, description: true,
      customer: { select: { id: true, name: true } },
      quote: { select: { id: true, number: true, version: true } },
      payments: { select: { method: true } },
      cancelledBy: { select: { id: true, number: true } },
      cancels: { select: { id: true, number: true } },
    },
  });
  return NextResponse.json({
    success: true,
    data: receipts.map(({ payments, ...r }) => ({ ...r, methods: [...new Set(payments.map((p) => p.method))] })),
  });
}

/** Issue a receipt. There is intentionally no update or delete endpoint. */
export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  try {
    const receipt = await issueReceipt(await req.json() as ReceiptDraft, user.id);
    return NextResponse.json({ success: true, data: { id: receipt.id, number: receipt.number } }, { status: 201 });
  } catch (err) {
    if (err instanceof ReceiptError) {
      return NextResponse.json({ success: false, error: err.message, fields: err.fields }, { status: err.status });
    }
    console.error('[receipts] issue failed', err);
    return NextResponse.json({ success: false, error: 'הפקת הקבלה נכשלה' }, { status: 500 });
  }
}
