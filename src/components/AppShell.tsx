'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Sparkles, Image as ImageIcon, Users, FileText, Receipt, Settings,
  LogOut, MoreHorizontal, Martini, type LucideIcon,
} from 'lucide-react';
import { CurrentUserProvider, useCurrentUser, hasBusinessAccess } from './CurrentUser';
import ThemeToggle from './ThemeToggle';

interface NavItem { href: string; label: string; icon: LucideIcon; business?: boolean }

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'בית',        icon: LayoutDashboard, business: true },
  { href: '/studio',    label: 'סטודיו AI',  icon: Sparkles },
  { href: '/gallery',   label: 'גלריה',      icon: ImageIcon },
  { href: '/customers', label: 'לקוחות',     icon: Users, business: true },
  { href: '/quotes',    label: 'הצעות מחיר', icon: FileText, business: true },
  { href: '/receipts',  label: 'קבלות',      icon: Receipt, business: true },
  { href: '/settings',  label: 'הגדרות',     icon: Settings },
];

/** Screens rendered without the app chrome (auth, print views, public share pages). */
const BARE_PREFIXES = ['/login', '/print/', '/d/'];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_PREFIXES.some((p) => pathname === p.replace(/\/$/, '') || pathname.startsWith(p));

  if (bare) return <>{children}</>;
  return (
    <CurrentUserProvider enabled>
      <Shell>{children}</Shell>
    </CurrentUserProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // First run: the owner sets up the business (needed for quotes and receipts) before anything else.
  useEffect(() => {
    if (user?.setupRequired && pathname !== '/setup') router.replace('/setup');
  }, [user, pathname, router]);

  const items = NAV.filter((i) => !i.business || hasBusinessAccess(user));
  // Mobile: up to 4 primary destinations in the bottom bar, the rest under "עוד".
  const mobilePrimary = items.length > 5 ? items.slice(0, 4) : items;
  const mobileMore = items.length > 5 ? items.slice(4) : [];

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar — fixed on the right (inline-start in RTL) */}
      <aside className="hidden lg:flex fixed inset-y-0 start-0 w-60 flex-col border-e border-[var(--border)] bg-[var(--surface)] z-30">
        <Link href={hasBusinessAccess(user) ? '/dashboard' : '/studio'} className="flex items-center gap-2.5 px-5 h-16 border-b border-[var(--border)]">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
            <Martini className="w-4 h-4 text-[var(--accent-fg)]" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-[15px] tracking-tight" dir="ltr">NIRO Workspace</div>
            <div className="text-[11px] text-[var(--text-muted)]">ניהול עסק וסטודיו AI</div>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive(pathname, href)
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]',
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--border)] flex items-center gap-1">
          <div className="flex-1 min-w-0 px-2 text-xs text-[var(--text-muted)] truncate" dir="ltr">{user?.phone}</div>
          <ThemeToggle />
          <button onClick={logout} className="btn-ghost !p-2 hover:!text-red-500" title="התנתק" aria-label="התנתק">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
            <Martini className="w-3.5 h-3.5 text-[var(--accent-fg)]" />
          </div>
          <span className="font-bold text-[15px]" dir="ltr">NIRO Workspace</span>
        </div>
        <div className="flex items-center">
          <ThemeToggle />
          <button onClick={logout} className="btn-ghost !p-2" aria-label="התנתק"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="lg:ps-60 pb-24 lg:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {mobilePrimary.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                isActive(pathname, href) ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
          {mobileMore.length > 0 && (
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                moreOpen || mobileMore.some((i) => isActive(pathname, i.href)) ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              עוד
            </button>
          )}
        </div>
      </nav>

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-20" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-16 inset-x-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xl mb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            {mobileMore.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
                  isActive(pathname, href) ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'text-[var(--text)]',
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
