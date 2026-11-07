'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, ShoppingCart, X } from 'lucide-react';
import { SHOP, shopHref } from '../config';
import { useCart } from '../cart';

const LINKS = [
  { href: `${shopHref('/')}#styles`, label: 'סגנונות' },
  { href: `${shopHref('/')}#how`, label: 'איך זה עובד' },
  { href: `${shopHref('/')}#product`, label: 'המוצר' },
  { href: `${shopHref('/')}#faq`, label: 'שאלות' },
];

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="grid grid-cols-2 gap-[2px] w-6 h-6" aria-hidden>
        <span className="bg-[var(--k-ink)]" /><span className="bg-[var(--k-cta)]" />
        <span className="bg-[var(--k-cta)]" /><span className="bg-[var(--k-ink)]" />
      </span>
      <span className="text-[24px] font-black tracking-tight">{SHOP.name}</span>
    </span>
  );
}

export default function ShopHeader() {
  const { totals, ready } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 bg-[var(--k-bg)]/92 backdrop-blur-md border-b border-[var(--k-line)]">
      <div className="k-container h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href={shopHref('/')} aria-label={`${SHOP.name}, דף הבית`}><Logo /></Link>
          <nav className="hidden md:flex items-center gap-6 text-[15px] font-medium">
            {LINKS.map((l) => <Link key={l.href} href={l.href} className="hover:text-[#8A6A00] transition-colors">{l.label}</Link>)}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <Link href={shopHref('/create')} className="hidden sm:inline-flex k-btn k-btn-cta k-btn-sm">ליצירת תמונה</Link>
          <Link href={shopHref('/cart')} className="relative p-2" aria-label={`עגלה, ${totals.qty} פריטים`}>
            <ShoppingCart className="w-6 h-6" />
            {ready && totals.qty > 0 && (
              <span className="absolute top-0 end-0 min-w-[20px] h-5 px-1 rounded-full bg-[var(--k-cta)] text-[var(--k-ink)] text-[11px] font-bold flex items-center justify-center">{totals.qty}</span>
            )}
          </Link>
          <button className="md:hidden p-2 -me-2" onClick={() => setOpen((v) => !v)} aria-label="תפריט" aria-expanded={open}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-[var(--k-line)] bg-[var(--k-bg)]">
          <div className="k-container py-2 flex flex-col">
            {LINKS.map((l) => <Link key={l.href} href={l.href} className="py-3 text-lg font-medium border-b border-[var(--k-line)]">{l.label}</Link>)}
            <div className="py-4"><Link href={shopHref('/create')} className="k-btn k-btn-cta w-full">ליצירת תמונה</Link></div>
          </div>
        </nav>
      )}
    </header>
  );
}
