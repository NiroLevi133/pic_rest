'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, FileText, Image as ImageIcon, Loader2, Mail, MapPin, Pencil, Phone, Plus, Receipt, User } from 'lucide-react';
import { formatILS } from '@/lib/money';
import { formatDate, formatDay } from '@/lib/dates';
import type { QuoteListItem } from '@/components/quotes/types';
import { formatPhone, CUSTOMER_STATUSES } from '@/lib/customers';
import BusinessGate from '@/components/BusinessGate';
import Tabs from '@/components/ui/Tabs';
import StatusBadge, { statusLabel } from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Spinner, { ErrorBox } from '@/components/ui/Spinner';
import CustomerForm, { type FieldErrors } from '@/components/customers/CustomerForm';
import type { Customer, CustomerDraft } from '@/components/customers/types';

type TabKey = 'details' | 'quotes' | 'payments' | 'activity';

interface ActivityEntry { id: string; action: string; summary: string; createdAt: string }
interface Finance { approvedTotal: number; paid: number; balance: number }
interface ReceiptRow { id: string; number: number; type: string; status: string; issuedAt: string; documentDate: string; total: number; description: string }

function toDraft(c: Customer): CustomerDraft {
  const { name, phone, email, taxId, address, notes, status } = c;
  return { name, phone, email, taxId, address, notes, status };
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function CustomerCard({ id }: { id: string }) {
  const [customer, setCustomer] = useState<(Customer & { mediaCount: number; quoteCount: number; finance: Finance }) | null>(null);
  const [quotes, setQuotes] = useState<QuoteListItem[] | null>(null);
  const [receipts, setReceipts] = useState<ReceiptRow[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<TabKey>('details');
  const [activity, setActivity] = useState<ActivityEntry[] | null>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CustomerDraft | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');
    const data = await (await fetch(`/api/customers/${id}`)).json().catch(() => null);
    if (!data?.success) { setLoadError(data?.error || 'טעינת הלקוח נכשלה'); return; }
    setCustomer(data.data);
  }, [id]);

  const loadActivity = useCallback(async () => {
    const data = await (await fetch(`/api/customers/${id}/activity`)).json().catch(() => null);
    setActivity(data?.success ? data.data : []);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'activity') loadActivity(); }, [tab, loadActivity]);
  useEffect(() => {
    if (tab === 'quotes' && !quotes) fetch(`/api/quotes?customerId=${id}`).then((r) => r.json()).then((d) => setQuotes(d.success ? d.data : []));
    if (tab === 'payments' && !receipts) fetch(`/api/receipts?customerId=${id}`).then((r) => r.json()).then((d) => setReceipts(d.success ? d.data : []));
  }, [tab, id, quotes, receipts]);

  async function patch(body: Partial<CustomerDraft>): Promise<boolean> {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) {
      setErrors(data.fields ?? {});
      setSaveError(data.error || 'השמירה נכשלה');
      return false;
    }
    setCustomer((prev) => (prev ? { ...prev, ...data.data } : prev));
    setActivity(null);
    return true;
  }

  async function saveEdit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!draft) return;
    setSaving(true);
    setSaveError('');
    try {
      if (await patch(draft)) setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: CustomerDraft['status']) {
    setStatusSaving(true);
    try { await patch({ status }); } finally { setStatusSaving(false); }
  }

  if (loadError) return <ErrorBox message={loadError} onRetry={load} />;
  if (!customer) return <Spinner />;

  return (
    <>
      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4">
        <ArrowRight className="w-4 h-4" /> כל הלקוחות
      </Link>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{customer.name}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-[var(--text-muted)]">
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1 hover:text-[var(--accent)]">
                    <Phone className="w-3.5 h-3.5" /><span dir="ltr">{formatPhone(customer.phone)}</span>
                  </a>
                )}
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1 hover:text-[var(--accent)]">
                    <Mail className="w-3.5 h-3.5" /><span dir="ltr">{customer.email}</span>
                  </a>
                )}
                {customer.address && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{customer.address}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={customer.status} />
            <select
              className="input !py-1.5 !w-auto text-xs"
              value={customer.status}
              onChange={(e) => changeStatus(e.target.value as CustomerDraft['status'])}
              disabled={statusSaving}
              aria-label="שינוי סטטוס"
            >
              {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
            {statusSaving && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />}
          </div>
        </div>
      </div>

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'details', label: 'פרטים', icon: User },
          { key: 'quotes', label: 'הצעות מחיר', icon: FileText, count: customer.quoteCount },
          { key: 'payments', label: 'קבלות ותשלומים', icon: Receipt },
          { key: 'activity', label: 'פעילות', icon: Clock },
        ]}
      />

      {tab === 'details' && (
        editing && draft ? (
          <form onSubmit={saveEdit} className="card space-y-4">
            {saveError && <ErrorBox message={saveError} />}
            <CustomerForm value={draft} onChange={setDraft} errors={errors} idPrefix="edit-cust" showStatus={false} />
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)} disabled={saving}>ביטול</button>
              <button type="submit" className="btn-primary" disabled={saving || !draft.name.trim()}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} שמירה
              </button>
            </div>
          </form>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">פרטי הלקוח</h2>
                <button className="btn-secondary !py-1.5" onClick={() => { setDraft(toDraft(customer)); setErrors({}); setSaveError(''); setEditing(true); }}>
                  <Pencil className="w-4 h-4" /> עריכה
                </button>
              </div>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {([
                  ['שם מלא / שם עסק', customer.name],
                  ['טלפון', customer.phone ? formatPhone(customer.phone) : ''],
                  ['אימייל', customer.email],
                  ['ח.פ / ע.מ / ת.ז', customer.taxId],
                  ['כתובת', customer.address],
                  ['נוצר בתאריך', formatDateTime(customer.createdAt)],
                ] as const).map(([label, val]) => (
                  <div key={label}>
                    <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
                    <dd className="mt-0.5">{val || <span className="text-[var(--text-muted)]">—</span>}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">הערות</p>
                <p className="text-sm whitespace-pre-wrap">{customer.notes || <span className="text-[var(--text-muted)]">אין הערות</span>}</p>
              </div>
            </div>
            <div className="card">
              <h2 className="font-semibold mb-3">תמונות משויכות</h2>
              <p className="text-3xl font-bold">{customer.mediaCount}</p>
              <Link href={`/gallery?customerId=${customer.id}`} className="btn-ghost !px-0 mt-2">
                <ImageIcon className="w-4 h-4" /> צפייה בגלריה
              </Link>
            </div>
          </div>
        )
      )}

      {tab === 'quotes' && (
        !quotes ? <Spinner /> : (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Link href={`/quotes/new?customerId=${customer.id}`} className="btn-primary"><Plus className="w-4 h-4" /> הצעה חדשה</Link>
            </div>
            {quotes.length === 0 ? (
              <EmptyState icon={FileText} title="אין עדיין הצעות מחיר" description="הצעות מחיר שתוציא ללקוח יופיעו כאן, עם הסכומים והסטטוסים." />
            ) : (
              <ul className="card !p-0 divide-y divide-[var(--border)]">
                {quotes.map((q) => (
                  <li key={q.id}>
                    <Link href={q.status === 'DRAFT' ? `/quotes/${q.id}/edit` : `/quotes/${q.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface2)]/60">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">הצעה {q.number}{q.version > 1 && `/${q.version}`} · {q.title || q.serviceType || 'ללא נושא'}</p>
                        <p className="text-xs text-[var(--text-muted)]">{q.eventDate ? `אירוע ${formatDay(q.eventDate)} · ` : ''}נוצרה {formatDate(q.createdAt)}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-semibold tabular-nums">{formatILS(q.total)}</p>
                        {q.paid > 0 && <p className="text-xs text-[var(--success)] tabular-nums">שולם {formatILS(q.paid)}</p>}
                      </div>
                      <StatusBadge status={q.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      )}

      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {([
              ['הצעות שאושרו', customer.finance.approvedTotal, ''],
              ['שולם', customer.finance.paid, 'text-[var(--success)]'],
              ['יתרה לתשלום', customer.finance.balance, customer.finance.balance > 0 ? 'text-[var(--warning)]' : ''],
            ] as const).map(([label, value, cls]) => (
              <div key={label} className="card !p-4">
                <p className="text-xs text-[var(--text-muted)]">{label}</p>
                <p className={`text-lg sm:text-xl font-bold tabular-nums ${cls}`}>{formatILS(value)}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Link href={`/receipts/new?customerId=${customer.id}`} className="btn-primary"><Plus className="w-4 h-4" /> קבלה חדשה</Link>
          </div>
          {!receipts ? <Spinner /> : receipts.length === 0 ? (
            <EmptyState icon={Receipt} title="אין עדיין תשלומים" description="קבלות שתפיק ללקוח יופיעו כאן." />
          ) : (
            <ul className="card !p-0 divide-y divide-[var(--border)]">
              {receipts.map((r) => (
                <li key={r.id}>
                  <Link href={`/receipts/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface2)]/60">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.type === 'CANCELLATION' ? 'מסמך ביטול' : 'קבלה'} {r.number} · {r.description}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatDay(r.documentDate)}</p>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums ${r.status === 'CANCELLED' ? 'line-through text-[var(--text-muted)]' : ''}`}>{formatILS(r.total)}</p>
                    {r.status === 'CANCELLED' && <StatusBadge status="CANCELLED" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'activity' && (
        !activity ? <Spinner /> : activity.length === 0 ? (
          <EmptyState icon={Clock} title="אין פעילות" />
        ) : (
          <ol className="card relative">
            {activity.map((a, i) => (
              <li key={a.id} className="flex gap-4 pb-5 last:pb-0 relative">
                {i < activity.length - 1 && <span className="absolute top-3 bottom-0 start-[5px] w-px bg-[var(--border)]" />}
                <span className="w-[11px] h-[11px] rounded-full bg-[var(--accent)] mt-1.5 shrink-0 relative" />
                <div>
                  <p className="text-sm">{a.summary}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatDateTime(a.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        )
      )}
    </>
  );
}

export default function CustomerPage({ params }: { params: { id: string } }) {
  return <BusinessGate><CustomerCard id={params.id} /></BusinessGate>;
}
