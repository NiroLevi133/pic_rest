import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { receiptFilters } from '@/lib/receipt-filters';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/lib/receipt-rules';
import type { ReceiptSnapshot } from '@/lib/receipt-snapshot';
import { formatDate } from '@/lib/dates';

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV of receipts for a period (for the accountant). Amounts in ₪. */
export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const receipts = await prisma.receipt.findMany({
    where: receiptFilters(req.nextUrl.searchParams),
    orderBy: { number: 'asc' },
    select: { number: true, type: true, status: true, issuedAt: true, total: true, snapshot: true },
  });

  const header = ['מספר', 'סוג', 'סטטוס', 'תאריך', 'שם המשלם', 'מזהה משלם', 'מהות התקבול', 'אמצעי תשלום', 'סכום (₪)', 'מבטל קבלה'];
  const rows = receipts.map((r) => {
    const s = r.snapshot as unknown as ReceiptSnapshot;
    return [
      r.number,
      r.type === 'CANCELLATION' ? 'מסמך ביטול' : 'קבלה',
      r.status === 'CANCELLED' ? 'בוטלה' : 'תקפה',
      formatDate(r.issuedAt),
      s.payer.name,
      s.payer.taxId,
      s.description,
      s.payments.map((p) => PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method).join(' + '),
      (r.total / 100).toFixed(2),
      s.cancels ? s.cancels.number : '',
    ];
  });
  const csv = '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const from = req.nextUrl.searchParams.get('from') ?? 'all';
  const to = req.nextUrl.searchParams.get('to') ?? 'all';
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="receipts_${from}_${to}.csv"`,
    },
  });
}
