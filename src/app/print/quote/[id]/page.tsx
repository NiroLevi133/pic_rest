import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getPageUser } from '@/lib/auth';
import { quoteDocData } from '@/lib/quotes-server';
import QuoteDocument from '@/components/documents/QuoteDocument';
import PrintToolbar from '@/components/documents/PrintToolbar';

export const dynamic = 'force-dynamic';

export default async function PrintQuotePage({ params }: { params: { id: string } }) {
  if (!(await getPageUser())) redirect('/login');
  const quote = await prisma.quote.findUnique({ where: { id: params.id }, include: { items: true, customer: true } });
  if (!quote) notFound();
  return (
    <main className="doc-screen">
      <PrintToolbar backHref={`/quotes/${quote.id}`} backLabel="חזרה להצעה" />
      <QuoteDocument data={await quoteDocData(quote)} />
    </main>
  );
}
