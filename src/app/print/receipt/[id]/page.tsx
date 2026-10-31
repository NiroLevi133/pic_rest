import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getPageUser } from '@/lib/auth';
import { verifyReceipt } from '@/lib/receipts';
import { COPY_LABEL, ORIGINAL_LABEL, type ReceiptSnapshot } from '@/lib/receipt-snapshot';
import ReceiptDocument from '@/components/documents/ReceiptDocument';
import PrintToolbar from '@/components/documents/PrintToolbar';

export const dynamic = 'force-dynamic';

export default async function PrintReceiptPage({ params }: { params: { id: string } }) {
  if (!(await getPageUser())) redirect('/login');
  const r = await prisma.receipt.findUnique({ where: { id: params.id }, include: { cancelledBy: { select: { number: true } } } });
  if (!r) notFound();
  // The first print produces the original; it registers via the toolbar right before printing.
  const label = r.originalChannel ? COPY_LABEL : ORIGINAL_LABEL;
  return (
    <main className="doc-screen">
      <PrintToolbar backHref={`/receipts/${r.id}`} backLabel="חזרה לקבלה" receiptId={r.id} />
      <ReceiptDocument
        snapshot={r.snapshot as unknown as ReceiptSnapshot}
        copyLabel={label}
        cancelled={r.cancelledBy}
        integrityOk={verifyReceipt(r)}
      />
    </main>
  );
}
