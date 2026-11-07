import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import UploadView from '@/shop/views/UploadView';
import { getStyle, STYLES } from '@/shop/styles';

export function generateStaticParams() {
  return STYLES.map((s) => ({ style: s.id }));
}

export function generateMetadata({ params }: { params: { style: string } }): Metadata {
  const s = getStyle(params.style);
  return s ? { title: s.title, description: s.description } : {};
}

export default function Page({ params }: { params: { style: string } }) {
  const style = getStyle(params.style);
  if (!style) notFound();
  return <UploadView style={style} />;
}
