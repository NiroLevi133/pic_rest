'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Search, Users } from 'lucide-react';
import { formatPhone, CUSTOMER_STATUSES } from '@/lib/customers';
import BusinessGate from '@/components/BusinessGate';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge, { statusLabel } from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Spinner, { ErrorBox } from '@/components/ui/Spinner';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import type { CustomerListItem } from '@/components/customers/types';

function CustomersList() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState('');
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

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
      const data = await (await fetch(`/api/customers?${sp}`)).json();
      if (!data.success) throw new Error();
      setCustomers(data.data);
    } catch {
      setError('טעינת הלקוחות נכשלה');
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, status]);

  useEffect(() => { load(); }, [load]);

  const filtered = !!(debouncedQ || status);

  return (
    <>
      <PageHeader
        title="לקוחות"
        subtitle={!loading && !error ? `${customers.length} לקוחות${filtered ? ' תואמים' : ''}` : undefined}
        actions={<button className="btn-primary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> לקוח חדש</button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-[var(--text-muted)]" />
          <input className="input ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם או טלפון" aria-label="חיפוש לקוחות" />
        </div>
        <select className="input sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="סינון לפי סטטוס">
          <option value="">כל הסטטוסים</option>
          {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : loading ? (
        <Spinner />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filtered ? 'לא נמצאו לקוחות' : 'עדיין אין לקוחות'}
          description={filtered ? 'נסה חיפוש או סינון אחר' : 'הוסף את הלקוח הראשון כדי להתחיל להוציא הצעות מחיר וקבלות'}
          action={!filtered && <button className="btn-primary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> לקוח חדש</button>}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface2)] text-[var(--text-muted)] text-xs">
                <tr>
                  <th className="text-start font-medium px-4 py-3">שם הלקוח</th>
                  <th className="text-start font-medium px-4 py-3">טלפון</th>
                  <th className="text-start font-medium px-4 py-3">סטטוס</th>
                  <th className="text-start font-medium px-4 py-3">הצעות מחיר</th>
                  <th className="px-4 py-3"><span className="sr-only">פעולה</span></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/customers/${c.id}`)}
                    className="border-t border-[var(--border)] hover:bg-[var(--surface2)]/60 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]" dir="ltr" style={{ textAlign: 'right' }}>{c.phone ? formatPhone(c.phone) : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">{c.quoteCount}</td>
                    <td className="px-4 py-3 text-end">
                      <Link href={`/customers/${c.id}`} className="btn-ghost !py-1 text-xs" onClick={(e) => e.stopPropagation()}>
                        פתיחת כרטיס <ChevronLeft className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden space-y-2">
            {customers.map((c) => (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="card !p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>{c.phone ? formatPhone(c.phone) : 'ללא טלפון'}</p>
                  </div>
                  <StatusBadge status={c.status} />
                  <ChevronLeft className="w-4 h-4 text-[var(--text-muted)]" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <CustomerFormModal open={creating} onClose={() => setCreating(false)} onCreated={(c) => router.push(`/customers/${c.id}`)} />
    </>
  );
}

export default function CustomersPage() {
  return <BusinessGate><CustomersList /></BusinessGate>;
}
