import Link from 'next/link';
import { SHOP, shopHref } from '../config';
import { Logo } from './ShopHeader';

export default function ShopFooter() {
  return (
    <footer className="border-t border-[var(--k-line)] bg-[var(--k-paper)] mt-24">
      <div className="k-container py-12 grid gap-8 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-[var(--k-muted)] max-w-xs">תמונות שלכם, של המשפחה ושל חיות המחמד, שהופכות ליצירות אמנות ממוסגרות על הקיר.</p>
        </div>
        <div>
          <h3 className="font-bold mb-3">יצירה</h3>
          <ul className="space-y-2 text-sm text-[var(--k-muted)]">
            <li><Link className="hover:text-[var(--k-ink)]" href={shopHref('/create')}>כל הסגנונות</Link></li>
            <li><Link className="hover:text-[var(--k-ink)]" href={shopHref('/cart')}>העגלה שלי</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-3">מידע</h3>
          <ul className="space-y-2 text-sm text-[var(--k-muted)]">
            <li><Link className="hover:text-[var(--k-ink)]" href={`${shopHref('/')}#faq`}>שאלות נפוצות</Link></li>
            <li><Link className="hover:text-[var(--k-ink)]" href={shopHref('/privacy')}>פרטיות ותנאי שימוש</Link></li>
            {SHOP.whatsapp && <li><a className="hover:text-[var(--k-ink)]" href={`https://wa.me/${SHOP.whatsapp}`} target="_blank" rel="noopener noreferrer">דברו איתנו בוואטסאפ</a></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--k-line)]">
        <div className="k-container py-5 text-xs text-[var(--k-muted)]">© {new Date().getFullYear()} {SHOP.name} · אריחי תמונה ממוסגרים, מודפסים בישראל</div>
      </div>
    </footer>
  );
}
