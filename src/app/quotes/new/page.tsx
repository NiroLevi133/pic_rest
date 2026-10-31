'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { FileText, Loader2, Martini } from 'lucide-react';
import BusinessGate from '@/components/BusinessGate';
import PageHeader from '@/components/ui/PageHeader';
import Spinner, { ErrorBox } from '@/components/ui/Spinner';
import CustomerPicker, { type PickedCustomer } from '@/components/customers/CustomerPicker';
import { QUOTE_TEMPLATE_LABELS, type QuoteTemplate } from '@/lib/quotes';

function NewQuote() {
  const router = useRouter();
  const params = useSearchParams();
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [template, setTemplate] = useState<QuoteTemplate>(params.get('template') === 'GENERAL' ? 'GENERAL' : 'NIRO_BAR');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = params.get('customerId');
    if (!id) return;
    fetch(`/api/customers/${id}`).then((r) => r.json()).then((d) => {
      if (d.success) setCustomer({ id: d.data.id, name: d.data.name, phone: d.data.phone });
    });
  }, [params]);

  async function create() {
    if (!customer) return;
    setCreating(true);
    setError('');
    try {
      const data = await (await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id, template }),
      })).json();
      if (!data.success) throw new Error(data.error);
      router.replace(`/quotes/${data.data.id}/edit?step=2`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירת ההצעה נכשלה');
      setCreating(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="הצעת מחיר חדשה" subtitle="בחר לקוח ותבנית — אחר כך ממלאים את הפרטים, והטיוטה נשמרת אוטומטית" />
      <div className="card space-y-5">
        <div>
          <label className="label" htmlFor="new-q-customer">לקוח</label>
          <CustomerPicker id="new-q-customer" value={customer} onChange={setCustomer} placeholder="חפש לקוח או צור חדש" />
        </div>
        <div>
          <p className="label">תבנית</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {(['NIRO_BAR', 'GENERAL'] as QuoteTemplate[]).map((t) => (
              <button key={t} type="button" onClick={() => setTemplate(t)} aria-pressed={template === t}
                className={clsx('text-start rounded-2xl border p-4 transition-colors',
                  template === t ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)] hover:bg-[var(--surface2)]')}>
                <span className="flex items-center gap-2 font-semibold">
                  {t === 'NIRO_BAR' ? <Martini className="w-5 h-5 text-[var(--accent)]" /> : <FileText className="w-5 h-5 text-[var(--accent)]" />}
                  {QUOTE_TEMPLATE_LABELS[t]}
                </span>
                <span className="block text-xs text-[var(--text-muted)] mt-1">
                  {t === 'NIRO_BAR' ? 'אירוע, "מה מחכה לכם?", מתנה ומדרגות מחיר — כולל הצעה מעוצבת' : 'שורות שירות/מוצרים לכל סוג עבודה'}
                </span>
              </button>
            ))}
          </div>
        </div>
        {error && <ErrorBox message={error} />}
        <div className="flex justify-end">
          <button className="btn-primary" disabled={!customer || creating} onClick={create}>
            {creating && <Loader2 className="w-4 h-4 animate-spin" />} המשך לפרטי ההצעה
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewQuotePage() {
  return <BusinessGate><Suspense fallback={<Spinner />}><NewQuote /></Suspense></BusinessGate>;
}
