'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { Building2, Check, Hash, ImagePlus, Loader2, Lock, Martini, X } from 'lucide-react';
import { useCurrentUser } from '@/components/CurrentUser';
import BusinessGate from '@/components/BusinessGate';
import Spinner, { ErrorBox } from '@/components/ui/Spinner';
import type { BusinessState } from '@/components/quotes/types';
import { VAT_TYPE_LABELS } from '@/lib/business-labels';
import { isValidIsraeliId } from '@/lib/receipt-rules';
import { fileToCompressedDataUrl, readFileAsDataUrl } from '@/app/studio/shared';

type VatType = keyof typeof VAT_TYPE_LABELS;

interface Form {
  businessName: string;
  vatType: VatType;
  taxId: string;
  vatRate: number;
  address: string;
  phone: string;
  email: string;
  documentFooter: string;
  defaultPaymentTerms: string;
  quoteStart: number;
  receiptStart: number;
}

function Setup() {
  const params = useSearchParams();
  const { user } = useCurrentUser();
  const [state, setState] = useState<BusinessState | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [logo, setLogo] = useState<string | null | undefined>(undefined); // undefined = unchanged
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    fetch('/api/business').then((r) => r.json()).then((d) => {
      if (!d.success) { setError('טעינת פרטי העסק נכשלה'); return; }
      const s: BusinessState = d.data;
      const p = s.profile;
      setState(s);
      setForm({
        businessName: p.businessName, vatType: p.vatType as VatType, taxId: p.taxId, vatRate: p.vatRate,
        address: p.address, phone: p.phone, email: p.email, documentFooter: p.documentFooter,
        defaultPaymentTerms: p.defaultPaymentTerms,
        quoteStart: s.counters.quote.next, receiptStart: s.counters.receipt.next,
      });
    });
  }, []);

  if (error && !form) return <ErrorBox message={error} />;
  if (!state || !form) return <Spinner />;

  const firstRun = !state.profile.setupCompletedAt;
  const isOwner = user?.role === 'OWNER';
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });
  const taxIdError = form.taxId && !isValidIsraeliId(form.taxId) ? 'המספר אינו תקין (ספרת ביקורת)' : '';
  const missing = [
    !form.businessName.trim() && 'שם העסק',
    !form.taxId.trim() && 'מספר עוסק / ח.פ',
    !form.address.trim() && 'כתובת',
  ].filter(Boolean) as string[];
  const logoUrl = logo === undefined ? state.profile.logoUrl : logo;

  async function pickLogo(file?: File) {
    if (!file) return;
    setLogo(file.size < 400_000 ? await readFileAsDataUrl(file) : await fileToCompressedDataUrl(file, 600));
  }

  async function save() {
    setTouched(true);
    if (!form || !form.businessName.trim() || taxIdError) return;
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = { ...form, completeSetup: true };
      if (state!.counters.quote.locked) delete body.quoteStart;
      if (state!.counters.receipt.locked) delete body.receiptStart;
      if (logo !== undefined) body.logo = logo;
      const data = await (await fetch('/api/business', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
      if (!data.success) throw new Error(data.error);
      // Full navigation so the shell reloads the user without the setup flag.
      window.location.href = params.get('return') || (firstRun ? '/quotes' : '/settings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-3">
          <Martini className="w-6 h-6 text-[var(--accent-fg)]" />
        </div>
        <h1 className="text-2xl font-bold">{firstRun ? 'ברוך הבא ל-NIRO Workspace' : 'פרטי העסק ומסמכים'}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {firstRun ? 'הגדרה חד-פעמית: הפרטים האלה יופיעו בהצעות המחיר ובקבלות.' : 'הפרטים מופיעים בהצעות ובקבלות חדשות. קבלות שכבר הופקו לא משתנות.'}
        </p>
      </div>

      {!isOwner && <div className="mb-4"><ErrorBox message="רק בעל העסק יכול לשנות את ההגדרות האלה." /></div>}

      <fieldset disabled={!isOwner || saving} className="space-y-5">
        <section className="card space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Building2 className="w-5 h-5 text-[var(--accent)]" /> פרטי העסק</h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden bg-[var(--surface2)] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoUrl ? <img src={logoUrl} alt="לוגו" className="w-full h-full object-contain" /> : <ImagePlus className="w-6 h-6 text-[var(--text-muted)]" />}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="btn-secondary cursor-pointer">
                <ImagePlus className="w-4 h-4" /> {logoUrl ? 'החלפת לוגו' : 'העלאת לוגו'}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickLogo(e.target.files?.[0])} />
              </label>
              {logoUrl && <button type="button" className="btn-ghost" onClick={() => setLogo(null)}><X className="w-4 h-4" /> הסרה</button>}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="b-name">שם העסק / שם העוסק</label>
              <input id="b-name" className="input" value={form.businessName} onChange={(e) => set({ businessName: e.target.value })} placeholder="לדוגמה: NIRO BAR" />
              {touched && !form.businessName.trim() && <p className="text-xs text-[var(--error)] mt-1">שדה חובה</p>}
            </div>
            <div className="sm:col-span-2">
              <p className="label">סוג העסק</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(VAT_TYPE_LABELS) as VatType[]).map((t) => (
                  <button key={t} type="button" onClick={() => set({ vatType: t })} aria-pressed={form.vatType === t}
                    className={clsx('py-2 rounded-xl border text-sm font-medium', form.vatType === t ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]')}>
                    {VAT_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="b-tax">{form.vatType === 'COMPANY' ? 'ח.פ' : 'מספר עוסק / ת.ז'}</label>
              <input id="b-tax" className="input" inputMode="numeric" dir="ltr" style={{ textAlign: 'right' }} value={form.taxId}
                onChange={(e) => set({ taxId: e.target.value.replace(/\D/g, '').slice(0, 9) })} />
              {taxIdError && <p className="text-xs text-[var(--error)] mt-1">{taxIdError}</p>}
            </div>
            {form.vatType !== 'EXEMPT' && (
              <div>
                <label className="label" htmlFor="b-vat">שיעור מע"מ (%)</label>
                <input id="b-vat" type="number" min={0} max={50} className="input" value={form.vatRate} onChange={(e) => set({ vatRate: Math.round(Number(e.target.value) || 0) })} />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label" htmlFor="b-address">כתובת העסק</label>
              <input id="b-address" className="input" value={form.address} onChange={(e) => set({ address: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="b-phone">טלפון</label>
              <input id="b-phone" className="input" inputMode="tel" dir="ltr" style={{ textAlign: 'right' }} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="b-email">אימייל</label>
              <input id="b-email" type="email" className="input" dir="ltr" style={{ textAlign: 'right' }} value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </div>
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Hash className="w-5 h-5 text-[var(--accent)]" /> מספור מסמכים</h2>
          <p className="text-xs text-[var(--text-muted)]">
            אם כבר הוצאת קבלות במערכת אחרת — התחל מהמספר הבא שלך. אפשר לשנות רק לפני שהופק המסמך הראשון.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {([
              ['receiptStart', 'מספר הקבלה הראשונה', state.counters.receipt.locked],
              ['quoteStart', 'מספר הצעת המחיר הראשונה', state.counters.quote.locked],
            ] as const).map(([key, label, locked]) => (
              <div key={key}>
                <label className="label" htmlFor={`b-${key}`}>{label}</label>
                <div className="relative">
                  <input id={`b-${key}`} type="number" min={1} className="input" value={form[key]} disabled={locked}
                    onChange={(e) => set({ [key]: Math.max(1, Math.round(Number(e.target.value) || 1)) })} />
                  {locked && <Lock className="w-4 h-4 absolute top-1/2 -translate-y-1/2 end-3 text-[var(--text-muted)]" />}
                </div>
                {locked && <p className="text-xs text-[var(--text-muted)] mt-1">נעול — כבר הופקו מסמכים. המספר הבא: {form[key]}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">ברירות מחדל למסמכים</h2>
          <div>
            <label className="label" htmlFor="b-terms">תנאי תשלום קבועים <span className="font-normal">(יוכנסו לכל הצעה חדשה)</span></label>
            <textarea id="b-terms" rows={3} className="input resize-none" value={form.defaultPaymentTerms} onChange={(e) => set({ defaultPaymentTerms: e.target.value })}
              placeholder="לדוגמה: מקדמה 30% לשריון התאריך, יתרה עד יום האירוע." />
          </div>
          <div>
            <label className="label" htmlFor="b-footer">שורת תחתית במסמכים <span className="font-normal">(אופציונלי)</span></label>
            <input id="b-footer" className="input" value={form.documentFooter} onChange={(e) => set({ documentFooter: e.target.value })} placeholder="לדוגמה: תודה שבחרתם ב-NIRO BAR 🍸" />
          </div>
        </section>
      </fieldset>

      {missing.length > 0 && (
        <p className="text-xs text-[var(--warning)] mt-4">להפקת קבלות יש להשלים גם: {missing.join(', ')}. אפשר לשמור עכשיו ולהשלים אחר כך.</p>
      )}
      {error && <div className="mt-4"><ErrorBox message={error} /></div>}

      {isOwner && (
        <div className="flex justify-end mt-5 mb-10">
          <button type="button" className="btn-primary py-3 px-6" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {firstRun ? 'שמירה והתחלה' : 'שמירה'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SetupPage() {
  return <BusinessGate><Suspense fallback={<Spinner />}><Setup /></Suspense></BusinessGate>;
}
