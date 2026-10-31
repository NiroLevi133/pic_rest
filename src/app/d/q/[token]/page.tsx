import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { quoteDocData } from '@/lib/quotes-server';
import QuoteDocument from '@/components/documents/QuoteDocument';
import PrintToolbar from '@/components/documents/PrintToolbar';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'הצעת מחיר', robots: { index: false, follow: false } };

/** Public view of a shared quote (unguessable token). */
export default async function SharedQuotePage({ params }: { params: { token: string } }) {
  const quote = await prisma.quote.findUnique({ where: { shareToken: params.token }, include: { items: true, customer: true } });
  if (!quote || quote.status === 'DRAFT') notFound();
  const design = quote.designAssetId
    ? await prisma.mediaAsset.findFirst({ where: { id: quote.designAssetId, deletedAt: null }, select: { url: true } })
    : null;

  return (
    <main className="doc-screen space-y-6">
      {design && (
        <div className="max-w-[210mm] mx-auto no-print">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={design.url} alt="הצעת מחיר מעוצבת" className="w-full max-w-md mx-auto rounded-2xl shadow-lg" />
        </div>
      )}
      <PrintToolbar pdfFileName={`הצעת מחיר ${quote.number}`} />
      <QuoteDocument data={await quoteDocData(quote)} />
    </main>
  );
}
