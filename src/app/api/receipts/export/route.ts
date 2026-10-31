import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { receiptFilters } from '@/lib/receipt-filters';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/lib/receipt-rules';
import type { ReceiptSnapshot } from '@/lib/receipt-snapshot';
import { formatDay } from '@/lib/dates';
import { publicBaseUrl } from '@/lib/quotes-server';

/**
 * Excel workbook of receipts for a period (for the accountant). Amounts in ₪.
 * The last column links to each receipt's designed view (with a PDF download).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const receipts = await prisma.receipt.findMany({
    where: receiptFilters(req.nextUrl.searchParams),
    orderBy: { number: 'asc' },
    select: { number: true, type: true, status: true, documentDate: true, total: true, snapshot: true, shareToken: true },
  });

  const base = publicBaseUrl(req);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NIRO Workspace';
  const ws = wb.addWorksheet('קבלות', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'מספר', key: 'number', width: 9 },
    { header: 'סוג', key: 'type', width: 12 },
    { header: 'סטטוס', key: 'status', width: 9 },
    { header: 'תאריך', key: 'date', width: 12 },
    { header: 'שם המשלם', key: 'payer', width: 22 },
    { header: 'מזהה משלם', key: 'payerId', width: 13 },
    { header: 'מהות התקבול', key: 'description', width: 40 },
    { header: 'אמצעי תשלום', key: 'methods', width: 16 },
    { header: 'סכום (₪)', key: 'total', width: 12, style: { numFmt: '#,##0.00' } },
    { header: 'מבטל קבלה', key: 'cancels', width: 11 },
    { header: 'צפייה בקבלה', key: 'link', width: 15 },
  ];
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3EEE4' } };

  for (const r of receipts) {
    const s = r.snapshot as unknown as ReceiptSnapshot;
    const row = ws.addRow({
      number: r.number,
      type: r.type === 'CANCELLATION' ? 'מסמך ביטול' : 'קבלה',
      status: r.status === 'CANCELLED' ? 'בוטלה' : 'תקפה',
      date: formatDay(r.documentDate),
      payer: s.payer.name,
      payerId: s.payer.taxId,
      description: s.description,
      methods: s.payments.map((p) => PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method).join(' + '),
      total: r.total / 100,
      cancels: s.cancels ? s.cancels.number : '',
      link: { text: 'פתיחה ↗', hyperlink: `${base}/d/r/${r.shareToken}` },
    });
    row.getCell('link').font = { color: { argb: 'FF2B6CB8' }, underline: true };
  }

  // Totals row (net: cancellations are negative)
  if (receipts.length > 0) {
    const last = receipts.length + 1;
    const totalRow = ws.addRow({ description: 'סה"כ (נטו)', total: { formula: `SUM(I2:I${last})` } });
    totalRow.font = { bold: true };
  }

  const buffer = await wb.xlsx.writeBuffer();
  const from = req.nextUrl.searchParams.get('from') ?? 'all';
  const to = req.nextUrl.searchParams.get('to') ?? 'all';
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="receipts_${from}_${to}.xlsx"`,
    },
  });
}
