import type { Metadata } from 'next';
import ResultsView from '@/shop/views/ResultsView';

export const metadata: Metadata = { title: 'היצירות שלכם', robots: { index: false } };

export default function Page({ params }: { params: { id: string } }) {
  return <ResultsView id={params.id} />;
}
