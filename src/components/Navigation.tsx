'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FlaskConical, Image as ImageIcon, Settings, BookOpen, LogOut, Phone, UtensilsCrossed } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';

const links = [
  { href: '/menu',     label: 'מעבדה',   icon: FlaskConical },
  { href: '/history',  label: 'תפריטים', icon: BookOpen },
  { href: '/gallery',  label: 'גלריה',   icon: ImageIcon },
  { href: '/settings', label: 'הגדרות',  icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.success) setPhone(d.data.phone); })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function formatPhone(p: string) {
    return p.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link href="/menu" className="flex items-center gap-2.5 cursor-pointer group">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0 transition-all duration-200 group-hover:bg-[var(--accent-hover)]">
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#0C0A09]" />
          </div>
          <span
            className="font-semibold text-[15px] text-[var(--text)] tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Restorante
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer',
                  active
                    ? 'bg-[var(--accent)]/12 text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]'
                )}
                dir="rtl"
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="flex items-center gap-2">
          {phone && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--surface)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
              <Phone className="w-3 h-3" />
              <span dir="ltr">{formatPhone(phone)}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/8 transition-all duration-200 cursor-pointer"
            title="התנתק"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">יציאה</span>
          </button>
        </div>

      </div>
    </header>
  );
}
