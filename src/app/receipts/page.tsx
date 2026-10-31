'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download, Plus, Receipt, Search } from 'lucide-react';
import BusinessGate from '@/components/BusinessGate';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Spinner, { ErrorBox } from '@/components/ui/Spinner';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/lib/receipt-rules';
import { formatILS } from '@/lib/money';
import { formatDate } from '@/lib/dates';

interface ReceiptRow {
  id: string;
  number: number;
  type: 'RECEIPT' | 'CANCELLATION';
  status: 'ISSUED' | 'CANCELLED';
  issuedAt: string;
  total: number;
  description: string;
  customer: { id: string; name: string };
  methods: PaymentMethod[];
  cancelledBy: { id: string; number: number } | null;
  cancels: { id: string; number: number } | null;
}

function TypeBadge({ r }: { r: ReceiptRow }) {
  if (r.type === 'CANCELLATION') return <StatusBadge label={`ביטול של ${r.cancels?.number ?? ''}`} tone="danger" />;
  return <StatusBadge status={r.status} />;
}

function ReceiptsList() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [method, setMethod] = useState('');
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const query = useCallback(() => {
    const sp = new URLSearchParams();
    if (debouncedQ.trim()) sp.set('q', debouncedQ.trim());
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    if (method) sp.set('method', method);
    return sp.toString();
  }, [debouncedQ, from, to, method]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await (await fetch(`/api/receipts?${query()}`)).json();
      if (!data.success) throw new Error();
      setRows(data.data);
    } catch {
      setError('טעינת הקבלות נכשלה');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);
  const filtered = !!(debouncedQ || from || to || method);
  const sum = rows.filter((r) => r.type === 'RECEIPT').reduce((s, r) => s + r.total, 0);
  const net = rows.reduce((s, r) => s + r.total, 0);

  return (
    <>
      <PageHeader
        title="קבלות"
        subtitle={!loading && !error ? `${rows.length} מסמכים · נטו ${formatILS(net)}${sum !== net ? ` (מתוך ${formatILS(sum)})` : ''}` : undefined}
        actions={
          <>
            <a href={`/api/receipts/export?${query()}`} className="btn-secondary"><Download className="w-4 h-4" /> ייצוא CSV</a>
            <Link href="/receipts/new" className="btn-primary"><Plus className="w-4 h-4" /> קבלה חדשה</Link>
          </>
        }
      />

      <div className="card !p-3 grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
        <div className="relative col-span-2">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-[var(--text-muted)]" />
          <input className="input ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="מספר קבלה או שם לקוח" aria-label="חיפוש קבלות" />
        </div>
        <input type="date" className="input min-w-0" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="מתאריך" />
        <input type="date" className="input min-w-0" value={to} onChange={(e) => setTo(e.target.value)} aria-label="עד תאריך" />
        <select className="input col-span-2 lg:col-span-1" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="אמצעי תשלום">
          <option value="">כל אמצעי התשלום</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
        </select>
        {filtered && <button className="btn-ghost col-span-2 lg:col-span-1 justify-center" onClick={() => { setQ(''); setFrom(''); setTo(''); setMethod(''); }}>ניקוי סינון</button>}
      </div>

      {error ? <ErrorBox message={error} onRetry={load} /> : loading ? <Spinner /> : rows.length === 0 ? (
        <EmptyState icon={Receipt} title={filtered ? 'לא נמצאו קבלות' : 'עדיין לא הופקו קבלות'}
          description={filtered ? 'נסה סינון אחר' : 'קבלות מופקות עם מספור רציף, נעולות לעריכה ונשמרות לצמיתות'}
          action={!filtered && <Link href="/receipts/new" className="btn-primary"><Plus className="w-4 h-4" /> קבלה חדשה</Link>} />
      ) : (
        <>
          <div className="hidden md:block card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface2)] text-[var(--text-muted)] text-xs">
                <tr>
                  <th className="text-start font-medium px-4 py-3">מס'</th>
                  <th className="text-start font-medium px-4 py-3">תאריך</th>
                  <th className="text-start font-medium px-4 py-3">לקוח</th>
                  <th className="text-start font-medium px-4 py-3">עבור</th>
                  <th className="text-start font-medium px-4 py-3">אמצעי</th>
                  <th className="text-start font-medium px-4 py-3">סכום</th>
                  <th className="text-start font-medium px-4 py-3">סטטוס</th>
                  <th className="px-4 py-3"><span className="sr-only">פעולה</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => router.push(`/receipts/${r.id}`)} className="border-t border-[var(--border)] hover:bg-[var(--surface2)]/60 cursor-pointer">
                    <td className="px-4 py-3 font-medium tabular-nums">{r.number}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{formatDate(r.issuedAt)}</td>
                    <td className="px-4 py-3">{r.customer.name}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)] max-w-[16rem] truncate">{r.description}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{r.methods.map((m) => PAYMENT_METHOD_LABELS[m]).join(', ') || '—'}</td>
                    <td className={`px-4 py-3 tabular-nums ${r.status === 'CANCELLED' ? 'line-through text-[var(--text-muted)]' : ''}`}>{formatILS(r.total)}</td>
                    <td className="px-4 py-3"><TypeBadge r={r} /></td>
                    <td className="px-4 py-3 text-end"><ChevronLeft className="w-4 h-4 text-[var(--text-muted)] inline" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="md:hidden space-y-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/receipts/${r.id}`} className="card !p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.number} · {r.customer.name}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{formatDate(r.issuedAt)} · {r.description}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${r.status === 'CANCELLED' ? 'line-through text-[var(--text-muted)]' : ''}`}>{formatILS(r.total)}</p>
                    <TypeBadge r={r} />
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

export default function ReceiptsPage() {
  return <BusinessGate><ReceiptsList /></BusinessGate>;
}
