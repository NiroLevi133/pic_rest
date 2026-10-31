import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifyReceipt } from '@/lib/receipts';
import { COPY_LABEL, ORIGINAL_LABEL, type ReceiptSnapshot } from '@/lib/receipt-snapshot';
import ReceiptDocument from '@/components/documents/ReceiptDocument';
import PrintToolbar from '@/components/documents/PrintToolbar';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'קבלה', robots: { index: false, follow: false } };

/**
 * Public view of a receipt sent to the payer. It is the "מקור" only when the
 * digital delivery produced the original (nothing was printed before sharing).
 */
export default async function SharedReceiptPage({ params }: { params: { token: string } }) {
  const r = await prisma.receipt.findUnique({ where: { shareToken: params.token }, include: { cancelledBy: { select: { number: true } } } });
  if (!r || !r.originalChannel) notFound();
  return (
    <main className="doc-screen">
      <PrintToolbar />
      <ReceiptDocument
        snapshot={r.snapshot as unknown as ReceiptSnapshot}
        copyLabel={r.originalChannel === 'SHARE' ? ORIGINAL_LABEL : COPY_LABEL}
        cancelled={r.cancelledBy}
        integrityOk={verifyReceipt(r)}
      />
    </main>
  );
}
