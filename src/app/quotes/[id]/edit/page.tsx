'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import {
  ArrowLeft, ArrowRight, Calculator, Check, CloudOff, FileText, Loader2, Martini, Printer, Send, Sparkles,
} from 'lucide-react';
import BusinessGate from '@/components/BusinessGate';
import Spinner, { ErrorBox } from '@/components/ui/Spinner';
import StatusBadge from '@/components/ui/StatusBadge';
import CustomerPicker, { type PickedCustomer } from '@/components/customers/CustomerPicker';
import MoneyInput from '@/components/quotes/MoneyInput';
import { ItemsEditor, TiersEditor } from '@/components/quotes/PricingEditors';
import NiroFeaturesEditor from '@/components/quotes/NiroFeaturesEditor';
import QuoteDesignPanel from '@/components/quotes/QuoteDesignPanel';
import QuoteDocument from '@/components/documents/QuoteDocument';
import { docBusinessFrom, type BusinessState, type QuoteDetail } from '@/components/quotes/types';
import {
  DEFAULT_NIRO_GIFT, QUOTE_TEMPLATE_LABELS, quoteTotals, validateQuoteForSend,
  type QuoteDraft, type QuoteTemplate,
} from '@/lib/quotes';
import { NIRO_BAR_EVENT_TYPES } from '@/lib/style-presets';
import { formatILS } from '@/lib/money';
import type { VatType } from '@/lib/quote-math';

const STEPS = ['לקוח ותבנית', 'פרטי האירוע', 'תמחור', 'תוכן ותנאים', 'סיכום ושליחה'] as const;
const OTHER = '__other__';

function Field({ label, optional, children, htmlFor, className }: { label: string; optional?: boolean; children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>{label}{optional && <span className="font-normal"> (אופציונלי)</span>}</label>
      {children}
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { key: T; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => (
        <button key={o.key} type="button" role="radio" aria-checked={value === o.key} onClick={() => onChange(o.key)}
          className={clsx('flex-1 min-w-[7rem] py-2 px-3 rounded-xl border text-sm font-medium transition-colors',
            value === o.key ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface2)]')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Wizard({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [business, setBusiness] = useState<BusinessState | null>(null);
  const [draft, setDraft] = useState<QuoteDraft | null>(null);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [step, setStep] = useState(() => Math.min(Math.max(Number(params.get('step') ?? 1), 1), 5));
  const [loadError, setLoadError] = useState('');
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [actionError, setActionError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [seedNiro, setSeedNiro] = useState(false);
  const [customEventType, setCustomEventType] = useState(false);
  const [giftOn, setGiftOn] = useState(false);
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    (async () => {
      const [q, b] = await Promise.all([
        fetch(`/api/quotes/${id}`).then((r) => r.json()).catch(() => null),
        fetch('/api/business').then((r) => r.json()).catch(() => null),
      ]);
      if (!q?.success) { setLoadError(q?.error || 'טעינת ההצעה נכשלה'); return; }
      if (q.data.status !== 'DRAFT') { router.replace(`/quotes/${id}`); return; }
      const d: QuoteDraft = q.data.draft;
      // First open of a fresh draft: sensible defaults
      if (d.template === 'NIRO_BAR' && d.niroFeatures.length === 0) setSeedNiro(true);
      if (d.priceMode === 'PER_PERSON' && d.tiers.length === 0) d.tiers = [{ max: 50, price: 0 }, { min: 51, max: 100, price: 0 }, { min: 101, price: 0 }];
      setCustomEventType(d.template === 'NIRO_BAR' && !!d.serviceType && !NIRO_BAR_EVENT_TYPES.includes(d.serviceType));
      setGiftOn(!!d.gift);
      setQuote(q.data);
      setDraft(d);
      setCustomer({ id: q.data.customer.id, name: q.data.customer.name, phone: q.data.customer.phone });
      if (b?.success) setBusiness(b.data);
    })();
  }, [id, router]);

  const save = useCallback(async () => {
    const current = draftRef.current;
    if (!current || !dirty.current) return true;
    dirty.current = false;
    setSaveState('saving');
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(current) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSaveState(dirty.current ? 'dirty' : 'saved');
      return true;
    } catch {
      dirty.current = true;
      setSaveState('error');
      return false;
    }
  }, [id]);

  // Debounced autosave
  function update(patch: Partial<QuoteDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    dirty.current = true;
    setSaveState('dirty');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 700);
  }

  // Flush on tab close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (dirty.current) { save(); e.preventDefault(); } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [save]);

  const vatType = (business?.profile.vatType ?? quote?.vat.type ?? 'EXEMPT') as VatType;
  const vatRate = business?.profile.vatRate ?? quote?.vat.rate ?? 18;
  const totals = useMemo(() => (draft ? quoteTotals(draft, vatType, vatRate) : null), [draft, vatType, vatRate]);
  const issues = draft && totals ? validateQuoteForSend(draft, totals.total) : [];

  async function goTo(n: number) {
    clearTimeout(saveTimer.current);
    await save();
    setStep(n);
    router.replace(`/quotes/${id}/edit?step=${n}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function finish(share: boolean) {
    setActionError('');
    clearTimeout(saveTimer.current);
    if (!(await save())) { setActionError('השמירה נכשלה — נסה שוב'); return; }
    if (!share) { router.push(`/quotes/${id}`); return; }
    setSharing(true);
    try {
      const data = await (await fetch(`/api/quotes/${id}/share`, { method: 'POST' })).json();
      if (!data.success) throw new Error([data.error, ...(data.issues ?? [])].join(' · '));
      window.open(data.data.whatsapp, '_blank', 'noopener');
      router.push(`/quotes/${id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'השליחה נכשלה');
    } finally {
      setSharing(false);
    }
  }

  async function openPrint() {
    clearTimeout(saveTimer.current);
    await save();
    window.open(`/print/quote/${id}`, '_blank');
  }

  if (loadError) return <ErrorBox message={loadError} />;
  if (!quote || !draft || !totals) return <Spinner />;

  const niro = draft.template === 'NIRO_BAR';

  return (
    <>
      <Link href={`/quotes/${id}`} className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-3">
        <ArrowRight className="w-4 h-4" /> להצעה
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">הצעת מחיר {quote.number}{quote.version > 1 && <span className="text-[var(--text-muted)] font-normal"> · גרסה {quote.version}</span>}</h1>
          <StatusBadge status="DRAFT" />
        </div>
        <span className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1" aria-live="polite">
          {saveState === 'saving' && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> שומר…</>}
          {saveState === 'saved' && <><Check className="w-3.5 h-3.5 text-[var(--success)]" /> נשמר</>}
          {saveState === 'dirty' && 'שינויים לא שמורים'}
          {saveState === 'error' && <span className="text-[var(--error)] inline-flex items-center gap-1"><CloudOff className="w-3.5 h-3.5" /> השמירה נכשלה</span>}
        </span>
      </div>

      {/* Stepper */}
      <ol className="flex gap-1 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {STEPS.map((label, i) => {
          const n = i + 1;
          return (
            <li key={label} className="flex-1 min-w-[5.5rem]">
              <button type="button" onClick={() => goTo(n)} aria-current={step === n ? 'step' : undefined}
                className={clsx('w-full text-start rounded-xl px-3 py-2 border transition-colors',
                  step === n ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)] hover:bg-[var(--surface2)]')}>
                <span className={clsx('block text-[11px]', step === n ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]')}>שלב {n}</span>
                <span className="block text-xs sm:text-sm font-medium truncate">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid lg:grid-cols-[1fr_18rem] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          {step === 1 && (
            <div className="card space-y-5">
              <Field label="לקוח" htmlFor="q-customer">
                <CustomerPicker id="q-customer" value={customer} onChange={(c) => { if (c) { setCustomer(c); update({ customerId: c.id }); } }} />
              </Field>
              <div>
                <p className="label">תבנית</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(['NIRO_BAR', 'GENERAL'] as QuoteTemplate[]).map((t) => (
                    <button key={t} type="button" onClick={() => {
                      if (t === draft.template) return;
                      if (t === 'NIRO_BAR') {
                        setSeedNiro(draft.niroFeatures.length === 0);
                        setGiftOn(true);
                        update({ template: t, gift: draft.gift || DEFAULT_NIRO_GIFT, priceMode: draft.priceMode === 'ITEMS' ? 'TOTAL' : draft.priceMode });
                      }
                      else update({ template: t });
                    }}
                      className={clsx('text-start rounded-2xl border p-4 transition-colors',
                        draft.template === t ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)] hover:bg-[var(--surface2)]')}>
                      <span className="flex items-center gap-2 font-semibold">
                        {t === 'NIRO_BAR' ? <Martini className="w-5 h-5 text-[var(--accent)]" /> : <FileText className="w-5 h-5 text-[var(--accent)]" />}
                        {QUOTE_TEMPLATE_LABELS[t]}
                      </span>
                      <span className="block text-xs text-[var(--text-muted)] mt-1">
                        {t === 'NIRO_BAR' ? 'פרטי אירוע, "מה מחכה לכם?", מתנה, מדרגות מחיר + הצעה מעוצבת' : 'הצעה עם שורות שירות/מוצרים, לכל סוג עבודה'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card grid sm:grid-cols-2 gap-4">
              <Field label={niro ? 'כותרת פנימית' : 'נושא ההצעה'} optional={niro} htmlFor="q-title" className="sm:col-span-2">
                <input id="q-title" className="input" value={draft.title} onChange={(e) => update({ title: e.target.value })}
                  placeholder={niro ? 'לדוגמה: בר קוקטיילים לחתונה של דנה ויוסי' : 'לדוגמה: צילום מנות לתפריט חדש'} />
              </Field>
              <Field label={niro ? 'סוג האירוע' : 'סוג השירות / האירוע'} optional={!niro} htmlFor="q-type">
                {niro ? (
                  <>
                    <select id="q-type" className="input" value={customEventType ? OTHER : draft.serviceType}
                      onChange={(e) => {
                        const other = e.target.value === OTHER;
                        setCustomEventType(other);
                        update({ serviceType: other ? '' : e.target.value });
                      }}>
                      <option value="">בחר…</option>
                      {NIRO_BAR_EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      <option value={OTHER}>אחר…</option>
                    </select>
                    {customEventType && (
                      <input className="input mt-2" value={draft.serviceType} onChange={(e) => update({ serviceType: e.target.value })} placeholder="הקלד סוג אירוע" aria-label="סוג אירוע אחר" autoFocus />
                    )}
                  </>
                ) : (
                  <input id="q-type" className="input" value={draft.serviceType} onChange={(e) => update({ serviceType: e.target.value })} />
                )}
              </Field>
              <Field label="תאריך האירוע" optional={!niro} htmlFor="q-date">
                <input id="q-date" type="date" className="input" value={draft.eventDate} onChange={(e) => update({ eventDate: e.target.value })} />
              </Field>
              <Field label="מיקום" optional={!niro} htmlFor="q-loc">
                <input id="q-loc" className="input" value={draft.location} onChange={(e) => update({ location: e.target.value })} placeholder="לדוגמה: גני יהודה, רחובות" />
              </Field>
              <Field label="כמות אורחים" optional={!niro} htmlFor="q-guests">
                <input id="q-guests" type="number" min={1} inputMode="numeric" className="input" value={draft.guestCount ?? ''}
                  onChange={(e) => update({ guestCount: e.target.value ? Math.max(1, Math.round(Number(e.target.value))) || null : null })} />
              </Field>
              <Field label="תפקיד / תיאור הלקוח" optional htmlFor="q-role" className="sm:col-span-2">
                <input id="q-role" className="input" value={draft.clientRole} onChange={(e) => update({ clientRole: e.target.value })} placeholder="לדוגמה: מנהלת אירועים / החתן והכלה" />
              </Field>
            </div>
          )}

          {step === 3 && (
            <>
              <div className="card space-y-4">
                <p className="label !mb-0">מבנה המחיר</p>
                <Segmented value={draft.priceMode} onChange={(v) => {
                  const patch: Partial<QuoteDraft> = { priceMode: v };
                  if (v === 'PER_PERSON' && draft.tiers.length === 0) patch.tiers = [{ max: 50, price: 0 }, { min: 51, max: 100, price: 0 }, { min: 101, price: 0 }];
                  update(patch);
                }} options={[
                  { key: 'TOTAL', label: 'מחיר חבילה' },
                  { key: 'PER_PERSON', label: 'מחיר לאדם (מדרגות)' },
                  { key: 'ITEMS', label: 'שורות בלבד' },
                ]} />
                {draft.priceMode === 'TOTAL' && (
                  <Field label="מחיר החבילה" htmlFor="q-package">
                    <MoneyInput id="q-package" value={draft.packagePrice || null} onChange={(v) => update({ packagePrice: v ?? 0 })} className="max-w-xs" />
                  </Field>
                )}
                {draft.priceMode === 'PER_PERSON' && (
                  <>
                    {!draft.guestCount && <p className="text-xs text-[var(--warning)]">הזן כמות אורחים בשלב 2 כדי לחשב את הסכום.</p>}
                    <TiersEditor tiers={draft.tiers} onChange={(tiers) => update({ tiers })} guestCount={draft.guestCount} matched={totals.matchedTier} />
                  </>
                )}
              </div>

              <div className="card space-y-3">
                <p className="label !mb-0">{draft.priceMode === 'ITEMS' ? 'שורות ההצעה' : 'תוספות'}</p>
                <ItemsEditor items={draft.items} onChange={(items) => update({ items })} savedServices={business?.profile.savedServices} />
              </div>

              <div className="card grid sm:grid-cols-2 gap-4">
                <Field label="הנחה" optional htmlFor="q-discount">
                  <div className="flex gap-2">
                    <select className="input !w-24" value={draft.discountType} aria-label="סוג הנחה"
                      onChange={(e) => update({ discountType: e.target.value as QuoteDraft['discountType'], discountValue: 0 })}>
                      <option value="AMOUNT">₪</option>
                      <option value="PERCENT">%</option>
                    </select>
                    {draft.discountType === 'AMOUNT' ? (
                      <MoneyInput id="q-discount" value={draft.discountValue || null} onChange={(v) => update({ discountValue: v ?? 0 })} className="flex-1" />
                    ) : (
                      <input id="q-discount" type="number" min={0} max={100} step="0.5" className="input flex-1" value={draft.discountValue ? draft.discountValue / 100 : ''}
                        onChange={(e) => update({ discountValue: Math.round(Math.min(100, Math.max(0, Number(e.target.value) || 0)) * 100) })} />
                    )}
                  </div>
                </Field>
                <Field label="מחיר לשעה נוספת" optional htmlFor="q-extra">
                  <MoneyInput id="q-extra" value={draft.extraHourPrice} onChange={(v) => update({ extraHourPrice: v })} />
                </Field>
                <Field label="מקדמה לשריון" optional htmlFor="q-deposit">
                  <MoneyInput id="q-deposit" value={draft.depositAmount} onChange={(v) => update({ depositAmount: v })} />
                  <div className="flex gap-1.5 mt-1.5">
                    {[25, 30, 50].map((p) => (
                      <button key={p} type="button" className="badge tone-neutral cursor-pointer" disabled={!totals.total}
                        onClick={() => update({ depositAmount: Math.round(totals.total * p / 10000) * 100 })}>{p}%</button>
                    ))}
                  </div>
                </Field>
                {vatType !== 'EXEMPT' && (
                  <label className="flex items-center gap-2 text-sm self-center cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-[var(--accent)]" checked={draft.pricesIncludeVat} onChange={(e) => update({ pricesIncludeVat: e.target.checked })} />
                    המחירים שהזנתי כוללים מע"מ
                  </label>
                )}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              {niro && (
                <div className="card space-y-5">
                  <div>
                    <p className="label">מה מחכה לכם — בחר מה לכלול, ואפשר לערוך את הניסוח</p>
                    <NiroFeaturesEditor value={draft.niroFeatures} onChange={(niroFeatures) => update({ niroFeatures })} seedDefaults={seedNiro} />
                  </div>
                  <div className="pt-4 border-t border-[var(--border)]">
                    <label className="flex items-center gap-2 cursor-pointer mb-2 text-sm font-medium">
                      <input type="checkbox" className="w-4 h-4 accent-[var(--accent)]" checked={giftOn}
                        onChange={(e) => { setGiftOn(e.target.checked); update({ gift: e.target.checked ? draft.gift || DEFAULT_NIRO_GIFT : '' }); }} />
                      לכלול מתנה עלינו
                    </label>
                    {giftOn && <input className="input" value={draft.gift} onChange={(e) => update({ gift: e.target.value })} aria-label="המתנה" />}
                  </div>
                </div>
              )}
              <div className="card grid sm:grid-cols-2 gap-4">
                <Field label="תנאי תשלום" optional htmlFor="q-terms" className="sm:col-span-2">
                  <textarea id="q-terms" rows={3} className="input resize-none" value={draft.paymentTerms} onChange={(e) => update({ paymentTerms: e.target.value })}
                    placeholder="לדוגמה: מקדמה 30% לשריון התאריך, יתרה עד יום האירוע. העברה בנקאית / ביט." />
                </Field>
                <Field label="הערות ללקוח" optional htmlFor="q-notes" className="sm:col-span-2">
                  <textarea id="q-notes" rows={3} className="input resize-none" value={draft.clientNotes} onChange={(e) => update({ clientNotes: e.target.value })} />
                </Field>
                <Field label="הערות פנימיות (לא מוצגות ללקוח)" optional htmlFor="q-internal" className="sm:col-span-2">
                  <textarea id="q-internal" rows={2} className="input resize-none" value={draft.internalNotes} onChange={(e) => update({ internalNotes: e.target.value })} />
                </Field>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              {issues.length > 0 && (
                <div className="card tone-warning !border-0 text-sm">
                  <p className="font-semibold mb-1">לפני השליחה צריך להשלים:</p>
                  <ul className="list-disc ps-5 space-y-0.5">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
                </div>
              )}
              {niro && (
                <QuoteDesignPanel quoteId={id} designAssetId={quote.designAssetId} fileName={`הצעת מחיר ${quote.number} - ${customer?.name ?? ''}`} blockers={issues}
                  onCreated={(assetId) => setQuote((q) => (q ? { ...q, designAssetId: assetId } : q))} />
              )}
              {business && customer && (
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <QuoteDocument data={{
                    business: docBusinessFrom(business.profile),
                    number: quote.number,
                    version: quote.version,
                    createdAt: new Date().toISOString(),
                    customer: { ...quote.customer, name: customer.name },
                    draft,
                    totals: { subtotal: totals.subtotal, discountAmount: totals.discountAmount, vatRate: totals.vatRate, vatAmount: totals.vatAmount, total: totals.total },
                  }} />
                </div>
              )}
              {actionError && <ErrorBox message={actionError} />}
              <div className="flex flex-wrap gap-2 justify-end">
                <button type="button" className="btn-secondary" onClick={openPrint}><Printer className="w-4 h-4" /> תצוגת הדפסה / PDF</button>
                <button type="button" className="btn-secondary" onClick={() => finish(false)}>שמור כטיוטה</button>
                <button type="button" className="btn-primary" disabled={issues.length > 0 || sharing} onClick={() => finish(true)}>
                  {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} שלח בוואטסאפ
                </button>
              </div>
            </>
          )}

          {step < 5 && (
            <div className="flex justify-between">
              <button type="button" className="btn-ghost" disabled={step === 1} onClick={() => goTo(step - 1)}><ArrowRight className="w-4 h-4" /> הקודם</button>
              <button type="button" className="btn-primary" onClick={() => goTo(step + 1)}>הבא <ArrowLeft className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* Live totals */}
        <aside className="card lg:sticky lg:top-6 space-y-2 text-sm">
          <h2 className="font-semibold flex items-center gap-2 mb-2"><Calculator className="w-4 h-4 text-[var(--accent)]" /> סיכום</h2>
          {totals.lines.length === 0 && <p className="text-xs text-[var(--text-muted)]">אין עדיין שורות מחיר</p>}
          {totals.lines.map((l, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span className="truncate text-[var(--text-muted)]">{l.description || 'ללא תיאור'}{l.quantity !== 1 && ` × ${l.quantity}`}</span>
              <span className="tabular-nums shrink-0">{formatILS(l.total)}</span>
            </div>
          ))}
          {totals.discountAmount > 0 && <div className="flex justify-between"><span>הנחה</span><span className="tabular-nums">-{formatILS(totals.discountAmount)}</span></div>}
          {totals.vatRate > 0 && <div className="flex justify-between"><span>מע"מ {totals.vatRate}%{draft.pricesIncludeVat ? ' (כלול)' : ''}</span><span className="tabular-nums">{formatILS(totals.vatAmount)}</span></div>}
          <div className="flex justify-between text-base font-bold pt-2 border-t border-[var(--border)]">
            <span>סה"כ</span><span className="tabular-nums">{formatILS(totals.total)}</span>
          </div>
          {draft.depositAmount ? <div className="flex justify-between text-[var(--text-muted)]"><span>מקדמה</span><span className="tabular-nums">{formatILS(draft.depositAmount)}</span></div> : null}
          {totals.warnings.map((w) => <p key={w} className="text-xs text-[var(--warning)]">{w}</p>)}
          {step < 5 && issues.length === 0 && (
            <button type="button" className="btn-ghost !px-0 text-xs" onClick={() => goTo(5)}><Sparkles className="w-3.5 h-3.5" /> מוכן — לסיכום ושליחה</button>
          )}
        </aside>
      </div>
    </>
  );
}

export default function EditQuotePage({ params }: { params: { id: string } }) {
  return <BusinessGate><Suspense fallback={<Spinner />}><Wizard id={params.id} /></Suspense></BusinessGate>;
}
