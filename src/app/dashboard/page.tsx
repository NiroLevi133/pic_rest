'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays, Clock, FilePlus2, FileText, Image as ImageIcon, Receipt, ReceiptText, Sparkles, UserPlus, Users, Wallet,
} from 'lucide-react';
import { useCurrentUser, hasBusinessAccess } from '@/components/CurrentUser';
import Spinner, { ErrorBox } from '@/components/ui/Spinner';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import { formatILS } from '@/lib/money';
import { formatDateTime, formatDay } from '@/lib/dates';

interface Dashboard {
  incomeMonth: number;
  incomeYear: number;
  openQuotes: { count: number; total: number };
  outstanding: number;
  customers: { active: number; newThisMonth: number };
  imagesMonth: number;
  upcoming: { id: string; number: number; status: string; serviceType: string; title: string; eventDate: string; location: string; total: number; customer: { name: string } }[];
  activity: { id: string; action: string; entityType: string; entityId: string; customerId: string | null; summary: string; createdAt: string }[];
}

/** Where a timeline entry leads when clicked. */
function activityHref(a: Dashboard['activity'][number]): string | null {
  if (a.entityType === 'quote' && !a.action.endsWith('deleted')) return `/quotes/${a.entityId}`;
  if (a.entityType === 'receipt') return `/receipts/${a.entityId}`;
  if (a.entityType === 'customer') return `/customers/${a.entityId}`;
  if (a.entityType === 'business') return '/settings';
  if (a.customerId) return `/customers/${a.customerId}`;
  return null;
}

function Metric({ icon: Icon, label, value, hint, href }: { icon: typeof Wallet; label: string; value: string; hint?: string; href: string }) {
  return (
    <Link href={href} className="card !p-4 hover:border-[var(--accent)]/50 transition-colors">
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Icon className="w-4 h-4 text-[var(--accent)]" /> {label}
      </div>
      <p className="text-xl sm:text-2xl font-bold mt-2 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-[var(--text-muted)] mt-0.5">{hint}</p>}
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [newCustomer, setNewCustomer] = useState(false);

  // Studio-only users have no business home — send them to the studio.
  useEffect(() => {
    if (!loading && !hasBusinessAccess(user)) router.replace('/studio');
  }, [loading, user, router]);

  useEffect(() => {
    if (!hasBusinessAccess(user)) return;
    fetch('/api/dashboard').then((r) => r.json()).then((d) => (d.success ? setData(d.data) : setError(d.error || 'טעינה נכשלה'))).catch(() => setError('טעינה נכשלה'));
  }, [user]);

  if (error) return <ErrorBox message={error} />;
  if (loading || !data) return <Spinner />;

  const month = new Date().toLocaleDateString('he-IL', { month: 'long', timeZone: 'Asia/Jerusalem' });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">שלום 👋</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">מה קורה בעסק היום</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Metric icon={Wallet} label={`הכנסות ב${month}`} value={formatILS(data.incomeMonth)} hint={`מתחילת השנה: ${formatILS(data.incomeYear)}`} href="/receipts" />
        <Metric icon={FileText} label="הצעות שממתינות לתשובה" value={String(data.openQuotes.count)} hint={data.openQuotes.count ? `בסך ${formatILS(data.openQuotes.total)}` : undefined} href="/quotes" />
        <Metric icon={ReceiptText} label="יתרות לגבייה" value={formatILS(data.outstanding)} hint="מהצעות שאושרו" href="/quotes" />
        <Metric icon={Users} label="לקוחות פעילים" value={String(data.customers.active)} hint={data.customers.newThisMonth ? `${data.customers.newThisMonth} חדשים החודש` : undefined} href="/customers" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {([
          ['/quotes/new', FilePlus2, 'הצעת מחיר חדשה'],
          ['/receipts/new', Receipt, 'קבלה חדשה'],
          [null, UserPlus, 'לקוח חדש'],
          ['/studio', Sparkles, 'יצירת תמונה'],
        ] as const).map(([href, Icon, label]) => {
          const cls = 'card !p-4 flex flex-col items-center justify-center gap-2 text-sm font-medium hover:bg-[var(--accent-dim)] hover:border-[var(--accent)]/50 transition-colors text-center';
          const body = <><Icon className="w-6 h-6 text-[var(--accent)]" />{label}</>;
          return href
            ? <Link key={label} href={href} className={cls}>{body}</Link>
            : <button key={label} type="button" className={cls} onClick={() => setNewCustomer(true)}>{body}</button>;
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><CalendarDays className="w-5 h-5 text-[var(--accent)]" /> אירועים קרובים</h2>
          {data.upcoming.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">אין אירועים קרובים בהצעות שנשלחו או אושרו</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] -my-2">
              {data.upcoming.map((q) => (
                <li key={q.id}>
                  <Link href={`/quotes/${q.id}`} className="flex items-center gap-3 py-2.5 hover:text-[var(--accent)]">
                    <div className="w-12 text-center shrink-0">
                      <p className="text-lg font-bold leading-none">{formatDay(q.eventDate).slice(0, 2)}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{formatDay(q.eventDate).slice(3)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{q.customer.name} · {q.serviceType || q.title || `הצעה ${q.number}`}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{q.location || '—'}</p>
                    </div>
                    <StatusBadge status={q.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><Clock className="w-5 h-5 text-[var(--accent)]" /> פעילות אחרונה</h2>
          {data.activity.length === 0 ? (
            <EmptyState icon={Clock} title="עדיין אין פעילות" />
          ) : (
            <ul className="space-y-3">
              {data.activity.map((a) => {
                const href = activityHref(a);
                const body = (
                  <>
                    <p className="text-sm">{a.summary}</p>
                    <p className="text-xs text-[var(--text-muted)]">{formatDateTime(a.createdAt)}</p>
                  </>
                );
                return <li key={a.id}>{href ? <Link href={href} className="block hover:text-[var(--accent)]">{body}</Link> : body}</li>;
              })}
            </ul>
          )}
          <p className="text-xs text-[var(--text-muted)] mt-4 flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> {data.imagesMonth} תמונות נוצרו החודש</p>
        </section>
      </div>

      <CustomerFormModal open={newCustomer} onClose={() => setNewCustomer(false)} onCreated={(c) => router.push(`/customers/${c.id}`)} />
    </>
  );
}
