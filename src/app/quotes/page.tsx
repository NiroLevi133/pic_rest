'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileText, Martini, Plus, Search } from 'lucide-react';
import BusinessGate from '@/components/BusinessGate';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge, { statusLabel } from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Spinner, { ErrorBox } from '@/components/ui/Spinner';
import { QUOTE_STATUSES } from '@/lib/quotes';
import { formatILS } from '@/lib/money';
import { formatDate, formatDay } from '@/lib/dates';
import type { QuoteListItem } from '@/components/quotes/types';

function QuoteNumber({ q }: { q: Pick<QuoteListItem, 'number' | 'version'> }) {
  return <span className="tabular-nums">{q.number}{q.version > 1 && <span className="text-[var(--text-muted)]">/{q.version}</span>}</span>;
}

function QuotesList() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState('');
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams();
      if (debouncedQ.trim()) sp.set('q', debouncedQ.trim());
      if (status) sp.set('status', status);
      const data = await (await fetch(`/api/quotes?${sp}`)).json();
      if (!data.success) throw new Error();
      setQuotes(data.data);
    } catch {
      setError('טעינת ההצעות נכשלה');
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, status]);

  useEffect(() => { load(); }, [load]);
  const filtered = !!(debouncedQ || status);
  const href = (x: QuoteListItem) => (x.status === 'DRAFT' ? `/quotes/${x.id}/edit` : `/quotes/${x.id}`);

  return (
    <>
      <PageHeader
        title="הצעות מחיר"
        subtitle={!loading && !error ? `${quotes.length} הצעות${filtered ? ' תואמות' : ''}` : undefined}
        actions={<Link href="/quotes/new" className="btn-primary"><Plus className="w-4 h-4" /> הצעה חדשה</Link>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-[var(--text-muted)]" />
          <input className="input ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי לקוח, מספר או אירוע" aria-label="חיפוש הצעות" />
        </div>
        <select className="input sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="סינון לפי סטטוס">
          <option value="">כל הסטטוסים</option>
          {QUOTE_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </div>

      {error ? <ErrorBox message={error} onRetry={load} /> : loading ? <Spinner /> : quotes.length === 0 ? (
        <EmptyState icon={FileText} title={filtered ? 'לא נמצאו הצעות' : 'עדיין אין הצעות מחיר'}
          description={filtered ? 'נסה חיפוש או סינון אחר' : 'צור הצעת מחיר ראשונה — עם מחשבון, PDF ושליחה בוואטסאפ'}
          action={!filtered && <Link href="/quotes/new" className="btn-primary"><Plus className="w-4 h-4" /> הצעה חדשה</Link>} />
      ) : (
        <>
          <div className="hidden md:block card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface2)] text-[var(--text-muted)] text-xs">
                <tr>
                  <th className="text-start font-medium px-4 py-3">מס'</th>
                  <th className="text-start font-medium px-4 py-3">לקוח</th>
                  <th className="text-start font-medium px-4 py-3">אירוע / נושא</th>
                  <th className="text-start font-medium px-4 py-3">סכום</th>
                  <th className="text-start font-medium px-4 py-3">סטטוס</th>
                  <th className="text-start font-medium px-4 py-3">נוצרה</th>
                  <th className="px-4 py-3"><span className="sr-only">פעולה</span></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((x) => (
                  <tr key={x.id} onClick={() => router.push(href(x))} className="border-t border-[var(--border)] hover:bg-[var(--surface2)]/60 cursor-pointer">
                    <td className="px-4 py-3 font-medium"><QuoteNumber q={x} /></td>
                    <td className="px-4 py-3">{x.customer.name}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1.5">
                        {x.template === 'NIRO_BAR' && <Martini className="w-3.5 h-3.5 text-[var(--accent)]" />}
                        {x.title || x.serviceType || '—'}{x.eventDate && ` · ${formatDay(x.eventDate)}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatILS(x.total)}
                      {x.paid > 0 && <span className="block text-xs text-[var(--success)]">שולם {formatILS(x.paid)}</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={x.status} /></td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{formatDate(x.createdAt)}</td>
                    <td className="px-4 py-3 text-end"><ChevronLeft className="w-4 h-4 text-[var(--text-muted)] inline" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="md:hidden space-y-2">
            {quotes.map((x) => (
              <li key={x.id}>
                <Link href={href(x)} className="card !p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{x.customer.name} <span className="text-[var(--text-muted)] font-normal">· <QuoteNumber q={x} /></span></p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{x.title || x.serviceType || formatDate(x.createdAt)}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{formatILS(x.total)}</p>
                    <StatusBadge status={x.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export default function QuotesPage() {
  return <BusinessGate><QuotesList /></BusinessGate>;
}
