'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { AlertTriangle, ArrowRight, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import BusinessGate from '@/components/BusinessGate';
import PageHeader from '@/components/ui/PageHeader';
import Spinner, { ErrorBox } from '@/components/ui/Spinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CustomerPicker, { type PickedCustomer } from '@/components/customers/CustomerPicker';
import MoneyInput from '@/components/quotes/MoneyInput';
import type { BusinessState, QuoteListItem } from '@/components/quotes/types';
import {
  MAX_PAYMENT_LINES, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PAYMENT_REFERENCE_LABELS, emptyPaymentLine,
  receiptTotal, validateReceiptDraft, type FieldErrors, type PayerDraft, type PaymentLineDraft, type PaymentMethod,
} from '@/lib/receipt-rules';
import { formatILS } from '@/lib/money';
import { israelToday } from '@/lib/dates';

interface OpenQuote extends QuoteListItem { balance: number; depositAmount: number | null }

const EMPTY_PAYER: PayerDraft = { name: '', taxId: '', address: '', addressExempt: false, phone: '', email: '' };

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-[var(--error)] mt-1" role="alert">{msg}</p> : null;
}

function NewReceipt() {
  const router = useRouter();
  const params = useSearchParams();
  const today = israelToday();
  const [business, setBusiness] = useState<BusinessState | null>(null);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [quotes, setQuotes] = useState<OpenQuote[]>([]);
  const [quoteId, setQuoteId] = useState<string>('');
  const [payer, setPayer] = useState<PayerDraft>(EMPTY_PAYER);
  const [description, setDescription] = useState('');
  const [payments, setPayments] = useState<PaymentLineDraft[]>([emptyPaymentLine('TRANSFER', today)]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => { fetch('/api/business').then((r) => r.json()).then((d) => d.success && setBusiness(d.data)); }, []);

  // Prefill from ?quoteId= or ?customerId=
  useEffect(() => {
    const qid = params.get('quoteId');
    const cid = params.get('customerId');
    (async () => {
      if (qid) {
        const d = await (await fetch(`/api/quotes/${qid}`)).json();
        if (d.success) {
          setCustomer({ id: d.data.customer.id, name: d.data.customer.name, phone: d.data.customer.phone });
          setQuoteId(qid);
        }
      } else if (cid) {
        const d = await (await fetch(`/api/customers/${cid}`)).json();
        if (d.success) setCustomer({ id: d.data.id, name: d.data.name, phone: d.data.phone });
      }
    })();
  }, [params]);

  // Customer → payer details + open quotes
  useEffect(() => {
    if (!customer) { setQuotes([]); return; }
    (async () => {
      const [c, q] = await Promise.all([
        fetch(`/api/customers/${customer.id}`).then((r) => r.json()),
        fetch(`/api/quotes?customerId=${customer.id}`).then((r) => r.json()),
      ]);
      if (c.success) {
        setPayer({ name: c.data.name, taxId: c.data.taxId, address: c.data.address, addressExempt: false, phone: c.data.phone, email: c.data.email });
      }
      if (q.success) {
        const open = (q.data as QuoteListItem[]).filter((x) => ['SENT', 'APPROVED', 'EXPIRED'].includes(x.status) && x.total > x.paid);
        // Deposit amounts come from the quote details
        const detailed = await Promise.all(open.map(async (x) => {
          const d = await (await fetch(`/api/quotes/${x.id}`)).json();
          return { ...x, balance: d.data?.balance ?? x.total - x.paid, depositAmount: d.data?.draft.depositAmount ?? null } as OpenQuote;
        }));
        setQuotes(detailed);
      }
    })();
  }, [customer]);

  const quote = quotes.find((q) => q.id === quoteId) ?? null;

  // Default description from the quote
  useEffect(() => {
    if (!quote) return;
    const subject = quote.title || quote.serviceType || 'שירותים';
    const kind = quote.paid > 0 ? 'תשלום' : 'מקדמה';
    setDescription((d) => d || `${kind} עבור ${subject} — הצעת מחיר ${quote.number}`);
  }, [quote]);

  const total = receiptTotal(payments);
  const draft = useMemo(() => ({ customerId: customer?.id ?? '', quoteId: quoteId || null, payer, description, payments, notes }), [customer, quoteId, payer, description, payments, notes]);
  useEffect(() => { setErrors(validateReceiptDraft(draft, today)); }, [draft, today]);
  const overBalance = quote ? total > quote.balance : false;
  const e = showErrors ? errors : {};

  const setLine = (i: number, patch: Partial<PaymentLineDraft>) => setPayments((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const fillFirst = (amount: number) => setPayments((prev) => prev.map((p, j) => (j === 0 ? { ...p, amount } : p)));

  function review() {
    setShowErrors(true);
    setServerError('');
    if (Object.keys(errors).length === 0 && !overBalance) setConfirming(true);
  }

  async function issue() {
    const res = await fetch('/api/receipts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    const data = await res.json();
    if (!data.success) {
      if (data.fields) setErrors(data.fields);
      setServerError(data.error);
      throw new Error(data.error);
    }
    router.replace(`/receipts/${data.data.id}?issued=1`);
  }

  if (!business) return <Spinner />;
  const businessMissing = Object.values(business.receiptIssues);

  return (
    <div className="max-w-3xl">
      <Link href="/receipts" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-3">
        <ArrowRight className="w-4 h-4" /> כל הקבלות
      </Link>
      <PageHeader title="קבלה חדשה" subtitle={`תקבל את מספר ${business.counters.receipt.next} — המספור אוטומטי ורציף`} />

      {businessMissing.length > 0 ? (
        <div className="card tone-warning !border-0 space-y-3">
          <p className="font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> לפני הפקת קבלות צריך להשלים את פרטי העסק</p>
          <ul className="list-disc ps-5 text-sm">{businessMissing.map((m) => <li key={m}>{m}</li>)}</ul>
          <Link href="/settings" className="btn-primary">להשלמת פרטי העסק בהגדרות</Link>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="card space-y-4">
            <h2 className="font-semibold">ממי התקבל התשלום</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="r-customer">לקוח</label>
                <CustomerPicker id="r-customer" value={customer} onChange={(c) => { setCustomer(c); setQuoteId(''); setDescription(''); }} />
                <Err msg={e.customerId} />
              </div>
              <div>
                <label className="label" htmlFor="r-quote">עבור הצעת מחיר <span className="font-normal">(אופציונלי)</span></label>
                <select id="r-quote" className="input" value={quoteId} onChange={(ev) => { setQuoteId(ev.target.value); setDescription(''); }} disabled={!customer}>
                  <option value="">ללא הצעה</option>
                  {quotes.map((q) => (
                    <option key={q.id} value={q.id}>{q.number}{q.version > 1 ? `/${q.version}` : ''} · {q.title || q.serviceType || 'הצעה'} · יתרה {formatILS(q.balance)}</option>
                  ))}
                </select>
              </div>
            </div>
            {customer && (
              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
                <div>
                  <label className="label" htmlFor="r-name">שם המשלם (כפי שיופיע בקבלה)</label>
                  <input id="r-name" className="input" value={payer.name} onChange={(ev) => setPayer({ ...payer, name: ev.target.value })} />
                  <Err msg={e['payer.name']} />
                </div>
                <div>
                  <label className="label" htmlFor="r-taxid">ת.ז / ח.פ של המשלם <span className="font-normal">(אופציונלי)</span></label>
                  <input id="r-taxid" className="input" inputMode="numeric" dir="ltr" style={{ textAlign: 'right' }} value={payer.taxId} onChange={(ev) => setPayer({ ...payer, taxId: ev.target.value })} />
                  <Err msg={e['payer.taxId']} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="r-address">כתובת המשלם</label>
                  <input id="r-address" className="input" value={payer.address} onChange={(ev) => setPayer({ ...payer, address: ev.target.value })} disabled={payer.addressExempt} />
                  <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1.5 cursor-pointer">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--accent)]" checked={payer.addressExempt}
                      onChange={(ev) => setPayer({ ...payer, addressExempt: ev.target.checked, address: ev.target.checked ? '' : payer.address })} />
                    פטור מציון כתובת המשלם (לפי החריגים בחוק)
                  </label>
                  <Err msg={e['payer.address']} />
                </div>
              </div>
            )}
          </div>

          <div className="card space-y-3">
            <label className="label !mb-0" htmlFor="r-desc">מהות התקבול — על מה התקבל הכסף</label>
            <textarea id="r-desc" rows={2} className="input resize-none" value={description} onChange={(ev) => setDescription(ev.target.value)}
              placeholder="לדוגמה: מקדמה עבור בר קוקטיילים לחתונה ב-12.9.2026" />
            <Err msg={e.description} />
          </div>

          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-semibold">אמצעי תשלום</h2>
              {quote && (
                <div className="flex gap-1.5">
                  {quote.depositAmount && quote.paid === 0 ? (
                    <button type="button" className="badge tone-accent cursor-pointer" onClick={() => fillFirst(Math.min(quote.depositAmount!, quote.balance))}>מקדמה {formatILS(Math.min(quote.depositAmount, quote.balance))}</button>
                  ) : null}
                  <button type="button" className="badge tone-accent cursor-pointer" onClick={() => fillFirst(quote.balance)}>כל היתרה {formatILS(quote.balance)}</button>
                </div>
              )}
            </div>
            {payments.map((p, i) => {
              const k = (f: string) => e[`payments.${i}.${f}`];
              return (
                <div key={i} className={clsx('rounded-xl border p-3 space-y-3', payments.length > 1 ? 'border-[var(--border)]' : 'border-transparent !p-0')}>
                  <div className="grid grid-cols-2 sm:grid-cols-[1.2fr_1fr_1fr_auto] gap-3 items-start">
                    <div>
                      <label className="label text-xs" htmlFor={`r-m-${i}`}>אמצעי</label>
                      <select id={`r-m-${i}`} className="input" value={p.method} onChange={(ev) => setLine(i, { method: ev.target.value as PaymentMethod })}>
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs" htmlFor={`r-a-${i}`}>סכום</label>
                      <MoneyInput id={`r-a-${i}`} value={p.amount || null} onChange={(v) => setLine(i, { amount: v ?? 0 })} invalid={!!k('amount')} />
                      <Err msg={k('amount')} />
                    </div>
                    <div>
                      <label className="label text-xs" htmlFor={`r-d-${i}`}>תאריך התשלום</label>
                      <input id={`r-d-${i}`} type="date" max={today} className="input" value={p.receivedAt} onChange={(ev) => setLine(i, { receivedAt: ev.target.value })} />
                      <Err msg={k('receivedAt')} />
                    </div>
                    {payments.length > 1 && (
                      <button type="button" className="btn-ghost !p-2 mt-6 justify-self-end" onClick={() => setPayments(payments.filter((_, j) => j !== i))} aria-label="הסר אמצעי תשלום">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="sm:w-1/2">
                      <label className="label text-xs" htmlFor={`r-ref-${i}`}>{PAYMENT_REFERENCE_LABELS[p.method]} <span className="font-normal">(אופציונלי)</span></label>
                      <input id={`r-ref-${i}`} className="input" value={p.reference} onChange={(ev) => setLine(i, { reference: ev.target.value })} />
                  </div>
                </div>
              );
            })}
            <Err msg={e.payments} />
            {payments.length < MAX_PAYMENT_LINES && (
              <button type="button" className="btn-ghost !px-2" onClick={() => setPayments([...payments, emptyPaymentLine('TRANSFER', today)])}>
                <Plus className="w-4 h-4" /> אמצעי תשלום נוסף (למשל חלק בביט וחלק במזומן)
              </button>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-[var(--border)]">
              <span className="font-semibold">סה"כ בקבלה</span>
              <span className="text-xl font-bold tabular-nums">{formatILS(total)}</span>
            </div>
            {overBalance && quote && <p className="text-xs text-[var(--error)]">הסכום גבוה מהיתרה בהצעה ({formatILS(quote.balance)})</p>}
          </div>

          <div className="card">
            <label className="label" htmlFor="r-notes">הערות על גבי הקבלה <span className="font-normal">(אופציונלי)</span></label>
            <input id="r-notes" className="input" value={notes} onChange={(ev) => setNotes(ev.target.value)} />
          </div>

          {serverError && !confirming && <ErrorBox message={serverError} />}
          {showErrors && Object.keys(errors).length > 0 && <p className="text-sm text-[var(--error)]">יש להשלים את השדות המסומנים.</p>}

          <div className="flex justify-end">
            <button type="button" className="btn-primary py-3 px-6" onClick={review}><ShieldCheck className="w-5 h-5" /> הפקת קבלה</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={issue}
        title={`להפיק קבלה מס' ${business.counters.receipt.next}?`}
        confirmLabel="הפק קבלה"
        message={
          <div className="space-y-2">
            <p><b>{payer.name}</b> · {formatILS(total)}</p>
            <p>{description}</p>
            <p className="text-[var(--warning)]">קבלה שהופקה נעולה — אי אפשר לערוך או למחוק אותה. לתיקון יש להפיק מסמך ביטול.</p>
          </div>
        }
      />
    </div>
  );
}

export default function NewReceiptPage() {
  return <BusinessGate><Suspense fallback={<Spinner />}><NewReceipt /></Suspense></BusinessGate>;
}
