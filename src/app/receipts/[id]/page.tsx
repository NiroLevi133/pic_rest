'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Ban, CheckCircle2, Download, Loader2, Lock, Printer, Send } from 'lucide-react';
import { downloadElementAsPdf } from '@/lib/pdf';
import BusinessGate from '@/components/BusinessGate';
import Spinner, { ErrorBox } from '@/components/ui/Spinner';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ReceiptDocument from '@/components/documents/ReceiptDocument';
import type { ReceiptSnapshot } from '@/lib/receipt-snapshot';
import { formatILS } from '@/lib/money';
import { formatDateTime, formatDay } from '@/lib/dates';

interface ReceiptDetail {
  id: string;
  number: number;
  type: 'RECEIPT' | 'CANCELLATION';
  status: 'ISSUED' | 'CANCELLED';
  issuedAt: string;
  documentDate: string;
  total: number;
  snapshot: ReceiptSnapshot;
  printCount: number;
  originalChannel: 'PRINT' | 'SHARE' | null;
  customer: { id: string; name: string; phone: string };
  quote: { id: string; number: number; version: number } | null;
  cancelledBy: { id: string; number: number; issuedAt: string } | null;
  cancels: { id: string; number: number } | null;
  cancelReason: string;
  integrityOk: boolean;
}

function ReceiptView({ id }: { id: string }) {
  const params = useSearchParams();
  const [r, setR] = useState<ReceiptDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  /** Label rendered on the off-screen copy used for the PDF */
  const [pdfLabel, setPdfLabel] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const data = await (await fetch(`/api/receipts/${id}`)).json().catch(() => null);
    if (!data?.success) { setError(data?.error || 'טעינת הקבלה נכשלה'); return; }
    setR(data.data);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function share() {
    setBusy('share');
    setActionError('');
    try {
      const data = await (await fetch(`/api/receipts/${id}/share`, { method: 'POST' })).json();
      if (!data.success) throw new Error(data.error);
      window.open(data.data.whatsapp, '_blank', 'noopener');
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'השיתוף נכשל');
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    if (!r) return;
    setBusy('pdf');
    setActionError('');
    try {
      // Register the production first: the first one is the "מקור".
      const data = await (await fetch(`/api/receipts/${id}/print?via=pdf`, { method: 'POST' })).json();
      if (!data.success) throw new Error(data.error);
      setPdfLabel(data.data.original ? 'מקור' : 'העתק נאמן למקור');
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));
      const el = pdfRef.current?.querySelector('article');
      if (!el) throw new Error('יצירת הקובץ נכשלה');
      const kind = r.type === 'CANCELLATION' ? 'ביטול קבלה' : 'קבלה';
      await downloadElementAsPdf(el as HTMLElement, `${kind} ${r.number} - ${r.customer.name}`);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'ההורדה נכשלה');
    } finally {
      setPdfLabel(null);
      setBusy(null);
    }
  }

  async function cancel() {
    const data = await (await fetch(`/api/receipts/${id}/cancel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
    })).json();
    if (!data.success) throw new Error(data.error);
    setReason('');
    await load();
  }

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!r) return <Spinner />;

  const isCancellation = r.type === 'CANCELLATION';
  const nextLabel = r.originalChannel ? 'העתק נאמן למקור' : 'מקור';

  return (
    <>
      <Link href="/receipts" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4">
        <ArrowRight className="w-4 h-4" /> כל הקבלות
      </Link>

      {params.get('issued') && (
        <div className="card tone-success !border-0 mb-4 flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5" /> קבלה {r.number} הופקה ונשמרה. עכשיו אפשר לשלוח אותה ללקוח או להדפיס.
        </div>
      )}

      <div className="card mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{isCancellation ? 'מסמך ביטול' : 'קבלה'} {r.number}</h1>
              {isCancellation ? <StatusBadge label="ביטול" tone="danger" /> : <StatusBadge status={r.status} />}
              <span className="badge tone-neutral inline-flex items-center gap-1"><Lock className="w-3 h-3" /> נעולה</span>
            </div>
            <p className="text-sm mt-1">
              <Link href={`/customers/${r.customer.id}`} className="font-medium hover:text-[var(--accent)]">{r.customer.name}</Link>
              <span className="text-[var(--text-muted)]"> · תאריך הקבלה {formatDay(r.documentDate)}</span>
              {r.quote && <> · <Link href={`/quotes/${r.quote.id}`} className="hover:text-[var(--accent)]">הצעה {r.quote.number}</Link></>}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              נוצרה במערכת {formatDateTime(r.issuedAt)} · {r.originalChannel ? `המקור הופק ${r.originalChannel === 'PRINT' ? 'בהדפסה' : 'בשליחה דיגיטלית'}` : 'המקור טרם הופק — ההדפסה או השליחה הראשונה תהיה המקור'}
              {r.printCount > 0 && ` · הודפסה ${r.printCount} פעמים`}
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{formatILS(r.total)}</p>
        </div>

        {r.cancelledBy && (
          <p className="mt-4 text-sm tone-danger rounded-xl px-3 py-2">
            הקבלה בוטלה במסמך ביטול <Link href={`/receipts/${r.cancelledBy.id}`} className="underline font-semibold">{r.cancelledBy.number}</Link> ({formatDateTime(r.cancelledBy.issuedAt)}).
          </p>
        )}
        {isCancellation && r.cancels && (
          <p className="mt-4 text-sm">
            מבטל את <Link href={`/receipts/${r.cancels.id}`} className="underline font-semibold">קבלה {r.cancels.number}</Link> · סיבה: {r.cancelReason}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-[var(--border)]">
          <button className="btn-primary" onClick={share} disabled={!!busy}>
            {busy === 'share' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} שלח בוואטסאפ
          </button>
          <button className="btn-secondary" onClick={downloadPdf} disabled={!!busy}>
            {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} הורדת PDF
          </button>
          <button className="btn-ghost" onClick={() => window.open(`/print/receipt/${id}`, '_blank')}><Printer className="w-4 h-4" /> הדפסה</button>
          {!isCancellation && r.status === 'ISSUED' && (
            <button className="btn-ghost text-[var(--error)] ms-auto" onClick={() => setCancelOpen(true)}><Ban className="w-4 h-4" /> ביטול קבלה</button>
          )}
        </div>
        {actionError && <div className="mt-3"><ErrorBox message={actionError} /></div>}
        {!r.integrityOk && <div className="mt-3"><ErrorBox message="אזהרה: תוכן הקבלה אינו תואם לחתימה שנשמרה בעת ההפקה." /></div>}
      </div>

      <div className="overflow-x-auto">
        <ReceiptDocument snapshot={r.snapshot} copyLabel={`תצוגה · ההפקה הבאה: ${nextLabel}`} cancelled={r.cancelledBy} integrityOk={r.integrityOk} />
      </div>

      {/* Off-screen, fixed A4 width copy that becomes the PDF */}
      {pdfLabel && (
        <div ref={pdfRef} aria-hidden className="fixed top-0 -left-[10000px] w-[794px] pointer-events-none [&_.doc-paper]:shadow-none [&_.doc-paper]:rounded-none">
          <ReceiptDocument snapshot={r.snapshot} copyLabel={pdfLabel} cancelled={r.cancelledBy} integrityOk={r.integrityOk} />
        </div>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancel}
        title={`ביטול קבלה ${r.number}`}
        confirmLabel="הפק מסמך ביטול"
        danger
        confirmDisabled={!reason.trim()}
        message={<p>הקבלה המקורית תישאר שמורה ותסומן כמבוטלת, ויופק מסמך ביטול חדש עם מספר רץ. הפעולה אינה הפיכה.</p>}
      >
        <label className="label mt-3" htmlFor="cancel-reason">סיבת הביטול</label>
        <input id="cancel-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="לדוגמה: טעות בסכום" autoFocus />
      </ConfirmDialog>
    </>
  );
}

export default function ReceiptPage({ params }: { params: { id: string } }) {
  return <BusinessGate><Suspense fallback={<Spinner />}><ReceiptView id={params.id} /></Suspense></BusinessGate>;
}
