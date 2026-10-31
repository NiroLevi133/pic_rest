'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Check, Copy, CopyPlus, FilePlus2, Loader2, Pencil, Printer, Receipt, Send, Trash2, X,
} from 'lucide-react';
import BusinessGate from '@/components/BusinessGate';
import Spinner, { ErrorBox } from '@/components/ui/Spinner';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import QuoteDocument from '@/components/documents/QuoteDocument';
import QuoteDesignPanel from '@/components/quotes/QuoteDesignPanel';
import { docBusinessFrom, type BusinessState, type QuoteDetail } from '@/components/quotes/types';
import { QUOTE_TRANSITIONS, type QuoteStatus } from '@/lib/quotes';
import { formatILS } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/dates';

function QuoteView({ id }: { id: string }) {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [business, setBusiness] = useState<BusinessState | null>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'delete' | 'REJECTED'>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const data = await (await fetch(`/api/quotes/${id}`)).json().catch(() => null);
    if (!data?.success) { setError(data?.error || 'טעינת ההצעה נכשלה'); return; }
    setQuote(data.data);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch('/api/business').then((r) => r.json()).then((d) => d.success && setBusiness(d.data)); }, []);

  async function act(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setActionError('');
    try { await fn(); } catch (err) { setActionError(err instanceof Error ? err.message : 'הפעולה נכשלה'); } finally { setBusy(null); }
  }

  const post = async (url: string, body?: unknown) => {
    const data = await (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })).json();
    if (!data.success) throw new Error([data.error, ...(data.issues ?? [])].join(' · '));
    return data.data;
  };

  const setStatus = (status: QuoteStatus) => act(status, async () => { await post(`/api/quotes/${id}/status`, { status }); await load(); });
  const share = () => act('share', async () => {
    const d = await post(`/api/quotes/${id}/share`);
    window.open(d.whatsapp, '_blank', 'noopener');
    await load();
  });
  const copyLink = () => act('copy', async () => {
    const d = await post(`/api/quotes/${id}/share`);
    await navigator.clipboard.writeText(d.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    await load();
  });
  const copyQuote = (mode: 'duplicate' | 'version') => act(mode, async () => {
    const d = await post('/api/quotes', { fromQuoteId: id, mode });
    router.push(`/quotes/${d.id}/edit`);
  });
  const remove = async () => {
    const data = await (await fetch(`/api/quotes/${id}`, { method: 'DELETE' })).json();
    if (!data.success) throw new Error(data.error);
    router.push('/quotes');
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!quote) return <Spinner />;

  const can = (to: QuoteStatus) => QUOTE_TRANSITIONS[quote.status]?.includes(to);
  const niro = quote.draft.template === 'NIRO_BAR';
  const latestVersion = Math.max(...quote.versions.map((v) => v.version));

  return (
    <>
      <Link href="/quotes" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4">
        <ArrowRight className="w-4 h-4" /> כל ההצעות
      </Link>

      <div className="card mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">הצעת מחיר {quote.number}</h1>
              {quote.version > 1 && <span className="text-sm text-[var(--text-muted)]">גרסה {quote.version}</span>}
              <StatusBadge status={quote.status} />
              {quote.version < latestVersion && <StatusBadge label={`יש גרסה ${latestVersion}`} tone="warning" />}
            </div>
            <p className="text-sm mt-1">
              <Link href={`/customers/${quote.customer.id}`} className="font-medium hover:text-[var(--accent)]">{quote.customer.name}</Link>
              <span className="text-[var(--text-muted)]"> · נוצרה {formatDate(quote.createdAt)}{quote.sentAt && ` · נשלחה ${formatDate(quote.sentAt)}`}</span>
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-4 text-center shrink-0">
            <div><dt className="text-xs text-[var(--text-muted)]">סה"כ</dt><dd className="font-bold tabular-nums">{formatILS(quote.totals.total)}</dd></div>
            <div><dt className="text-xs text-[var(--text-muted)]">שולם</dt><dd className="font-bold tabular-nums text-[var(--success)]">{formatILS(quote.paid)}</dd></div>
            <div><dt className="text-xs text-[var(--text-muted)]">יתרה</dt><dd className="font-bold tabular-nums">{formatILS(quote.balance)}</dd></div>
          </dl>
        </div>

        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-[var(--border)]">
          {quote.status === 'DRAFT' && (
            <>
              <Link href={`/quotes/${id}/edit`} className="btn-primary"><Pencil className="w-4 h-4" /> המשך עריכה</Link>
              <button className="btn-secondary" onClick={share} disabled={!!busy || quote.sendIssues.length > 0}>
                {busy === 'share' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} שלח בוואטסאפ
              </button>
            </>
          )}
          {quote.status !== 'DRAFT' && quote.status !== 'APPROVED' && (
            <button className="btn-secondary" onClick={share} disabled={!!busy}>
              {busy === 'share' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} שלח שוב בוואטסאפ
            </button>
          )}
          {can('APPROVED') && (
            <button className="btn-primary" onClick={() => setStatus('APPROVED')} disabled={!!busy}>
              {busy === 'APPROVED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} הלקוח אישר
            </button>
          )}
          {(quote.status === 'APPROVED' || quote.status === 'SENT') && quote.balance > 0 && (
            <Link href={`/receipts/new?quoteId=${id}`} className={quote.status === 'APPROVED' ? 'btn-primary' : 'btn-secondary'}>
              <Receipt className="w-4 h-4" /> רשום תשלום והפק קבלה
            </Link>
          )}
          {can('REJECTED') && (
            <button className="btn-ghost" onClick={() => setConfirm('REJECTED')} disabled={!!busy}><X className="w-4 h-4" /> נדחתה</button>
          )}
          <button className="btn-secondary" onClick={() => window.open(`/print/quote/${id}`, '_blank')}><Printer className="w-4 h-4" /> PDF / הדפסה</button>
          {quote.status !== 'DRAFT' && (
            <button className="btn-ghost" onClick={copyLink} disabled={!!busy}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'הקישור הועתק' : 'העתק קישור'}
            </button>
          )}
          {quote.status !== 'DRAFT' && (
            <button className="btn-ghost" onClick={() => copyQuote('version')} disabled={!!busy}><FilePlus2 className="w-4 h-4" /> גרסה מעודכנת</button>
          )}
          <button className="btn-ghost" onClick={() => copyQuote('duplicate')} disabled={!!busy}><CopyPlus className="w-4 h-4" /> שכפול</button>
          {quote.status === 'DRAFT' && quote.receipts.length === 0 && (
            <button className="btn-ghost text-[var(--error)]" onClick={() => setConfirm('delete')}><Trash2 className="w-4 h-4" /> מחיקת טיוטה</button>
          )}
        </div>
        {quote.status === 'DRAFT' && quote.sendIssues.length > 0 && (
          <p className="text-xs text-[var(--warning)] mt-3">לפני שליחה: {quote.sendIssues.join(' · ')}</p>
        )}
        {actionError && <div className="mt-3"><ErrorBox message={actionError} /></div>}
      </div>

      <div className="grid lg:grid-cols-[1fr_20rem] gap-6 items-start">
        <div className="min-w-0 overflow-x-auto">
          {business ? (
            <QuoteDocument data={{
              business: docBusinessFrom(business.profile),
              number: quote.number, version: quote.version, createdAt: quote.sentAt ?? quote.createdAt,
              customer: quote.customer, draft: quote.draft, totals: quote.totals,
            }} />
          ) : <Spinner />}
        </div>

        <div className="space-y-5">
          {niro && (
            <QuoteDesignPanel quoteId={id} designAssetId={quote.designAssetId} fileName={`הצעת מחיר ${quote.number} - ${quote.customer.name}`}
              blockers={quote.sendIssues} />
          )}

          <div className="card">
            <h2 className="font-semibold mb-3">תשלומים וקבלות</h2>
            {quote.receipts.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">לא נרשמו תשלומים</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {quote.receipts.map((r) => (
                  <li key={r.id}>
                    <Link href={`/receipts/${r.id}`} className="flex items-center justify-between gap-2 hover:text-[var(--accent)]">
                      <span>{r.type === 'CANCELLATION' ? 'ביטול' : 'קבלה'} {r.number} · {formatDate(r.issuedAt)}</span>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums">{formatILS(r.total)}</span>
                        {r.status === 'CANCELLED' && <StatusBadge status="CANCELLED" />}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-between text-sm font-semibold mt-3 pt-3 border-t border-[var(--border)]">
              <span>יתרה לתשלום</span><span className="tabular-nums">{formatILS(quote.balance)}</span>
            </div>
          </div>

          {quote.versions.length > 1 && (
            <div className="card">
              <h2 className="font-semibold mb-3">גרסאות</h2>
              <ul className="space-y-2 text-sm">
                {quote.versions.map((v) => (
                  <li key={v.id}>
                    <Link href={`/quotes/${v.id}`} className={`flex items-center justify-between gap-2 ${v.id === id ? 'font-semibold' : 'hover:text-[var(--accent)]'}`}>
                      <span>גרסה {v.version} · {formatDateTime(v.createdAt)}</span>
                      <StatusBadge status={v.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title="למחוק את הטיוטה?"
        message="הטיוטה תימחק לצמיתות. הצעות שנשלחו לא נמחקות."
        confirmLabel="מחיקה"
        danger
      />
      <ConfirmDialog
        open={confirm === 'REJECTED'}
        onClose={() => setConfirm(null)}
        onConfirm={() => setStatus('REJECTED')}
        title="לסמן את ההצעה כנדחתה?"
        message="אפשר לשנות לאושרה גם אחר כך."
        confirmLabel="סמן כנדחתה"
      />
    </>
  );
}

export default function QuotePage({ params }: { params: { id: string } }) {
  return <BusinessGate><QuoteView id={params.id} /></BusinessGate>;
}
