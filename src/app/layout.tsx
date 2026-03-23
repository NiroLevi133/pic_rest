import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Restorante – Menu to Images',
  description: 'AI-powered restaurant menu image generator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="ltr">
      <body className="min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
