'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import {
  Loader2, Receipt as ReceiptIcon, Users, Building2, Search, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, FileText,
} from 'lucide-react';
import { PAYMENT_METHODS, BUSINESS_TYPES, formatAmount, formatPhone, normalizePhone, type ReceiptDTO } from '@/lib/receipts';

interface CustomerRow {
  id: string;
  fullName: string;
  phone: string;
  company: string | null;
  taxId: string | null;
  email: string | null;
  address: string | null;
  receiptCount: number;
  totalAmount: number;
  lastReceiptAt: string | null;
}

interface BusinessSettings {
  businessName: string | null;
  businessTaxId: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessType: string;
  nextNumber: number;
  restaurantName: string | null;
}

type Tab = 'receipts' | 'customers' | 'business';

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  phone: '', fullName: '', company: '', taxId: '', email: '', address: '',
  amount: '', paymentMethod: 'cash', paymentRef: '', description: '', issueDate: today(),
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL');
}

/* ── New receipt form ───────────────────────────────────────────── */
function NewReceiptForm({ nextNumber, onIssued }: { nextNumber: number | null; onIssued: (r: ReceiptDTO) => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showMore, setShowMore] = useState(false);
  const [knownCustomer, setKnownCustomer] = useState<CustomerRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Existing customer? Fill in their details from the phone number
  async function lookupPhone() {
    const digits = normalizePhone(form.phone);
    if (digits.length < 9) { setKnownCustomer(null); return; }
    const res = await fetch(`/api/customers?q=${digits}`).then((r) => r.json()).catch(() => null);
    const match: CustomerRow | undefined = res?.data?.find((c: CustomerRow) => c.phone === digits);
    setKnownCustomer(match ?? null);
    if (match) {
      setForm((f) => ({
        ...f,
        fullName: f.fullName || match.fullName,
        company: f.company || match.company || '',
        taxId: f.taxId || match.taxId || '',
        email: f.email || match.email || '',
        address: f.address || match.address || '',
      }));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }).then((r) => r.json());
      if (!res.success) { setError(res.error || 'שגיאה בהפקת הקבלה'); return; }
      setForm({ ...EMPTY_FORM, issueDate: today() });
      setKnownCustomer(null);
      setShowMore(false);
      onIssued(res.data);
    } catch {
      setError('שגיאת רשת');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">קבלה חדשה</h2>
        {nextNumber !== null && <span className="text-sm text-[var(--text-muted)]">מס׳ {nextNumber}</span>}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">טלפון *</label>
          <input className="input" dir="ltr" inputMode="tel" required value={form.phone} onChange={set('phone')} onBlur={lookupPhone} placeholder="050-0000000" />
          {knownCustomer && (
            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> לקוח קיים · {knownCustomer.receiptCount} קבלות
            </p>
          )}
        </div>
        <div>
          <label className="label">שם מלא *</label>
          <input className="input" required value={form.fullName} onChange={set('fullName')} />
        </div>
        <div>
          <label className="label">סכום (₪) *</label>
          <input className="input" dir="ltr" type="number" step="0.01" min="0.01" inputMode="decimal" required value={form.amount} onChange={set('amount')} />
        </div>
        <div>
          <label className="label">אמצעי תשלום *</label>
          <select className="input" value={form.paymentMethod} onChange={set('paymentMethod')}>
            {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">עבור</label>
          <input className="input" value={form.description} onChange={set('description')} placeholder="למשל: אירוע בר 15.11" />
        </div>
      </div>

      <button type="button" onClick={() => setShowMore((v) => !v)} className="btn-ghost text-sm">
        {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        פרטים נוספים (אופציונלי)
      </button>

      {showMore && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">שם חברה</label><input className="input" value={form.company} onChange={set('company')} /></div>
          <div><label className="label">ח.פ / ת.ז לקוח</label><input className="input" dir="ltr" value={form.taxId} onChange={set('taxId')} /></div>
          <div><label className="label">אימייל</label><input className="input" dir="ltr" type="email" value={form.email} onChange={set('email')} /></div>
          <div><label className="label">כתובת</label><input className="input" value={form.address} onChange={set('address')} /></div>
          <div><label className="label">אסמכתא (מס׳ צ׳ק / העברה)</label><input className="input" dir="ltr" value={form.paymentRef} onChange={set('paymentRef')} /></div>
          <div><label className="label">תאריך</label><input className="input" dir="ltr" type="date" value={form.issueDate} onChange={set('issueDate')} /></div>
        </div>
      )}

      {error && <p className="text-sm text-red-400 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        הפק קבלה
      </button>
    </form>
  );
}

/* ── Business details ───────────────────────────────────────────── */
function BusinessForm({ settings, onSaved }: { settings: BusinessSettings; onSaved: (s: BusinessSettings) => void }) {
  const [form, setForm] = useState({
    businessName: settings.businessName ?? settings.restaurantName ?? '',
    businessTaxId: settings.businessTaxId ?? '',
    businessAddress: settings.businessAddress ?? '',
    businessPhone: settings.businessPhone ?? '',
    businessType: settings.businessType,
    nextNumber: String(settings.nextNumber),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch('/api/receipts/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then((r) => r.json()).catch(() => ({ success: false, error: 'שגיאת רשת' }));
    setSaving(false);
    if (!res.success) { setMsg({ ok: false, text: res.error }); return; }
    setMsg({ ok: true, text: 'נשמר' });
    onSaved(res.data);
  }

  return (
    <form onSubmit={save} className="card space-y-4 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">פרטי העסק</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">הפרטים יודפסו על כל קבלה חדשה. קבלות שכבר הופקו לא משתנות.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">שם העסק</label><input className="input" value={form.businessName} onChange={set('businessName')} /></div>
        <div>
          <label className="label">סוג עוסק</label>
          <select className="input" value={form.businessType} onChange={set('businessType')}>
            {Object.entries(BUSINESS_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div><label className="label">מס׳ עוסק / ח.פ</label><input className="input" dir="ltr" value={form.businessTaxId} onChange={set('businessTaxId')} /></div>
        <div><label className="label">טלפון העסק</label><input className="input" dir="ltr" value={form.businessPhone} onChange={set('businessPhone')} /></div>
        <div className="sm:col-span-2"><label className="label">כתובת</label><input className="input" value={form.businessAddress} onChange={set('businessAddress')} /></div>
        <div>
          <label className="label">מספר הקבלה הבא</label>
          <input className="input" dir="ltr" type="number" min="1" value={form.nextNumber} onChange={set('nextNumber')} />
          <p className="text-xs text-[var(--text-muted)] mt-1">אם המשכת מפנקס קבלות ידני – הזן את המספר הבא. אפשר רק לקדם, לא לחזור אחורה.</p>
        </div>
      </div>
      {msg && <p className={clsx('text-sm', msg.ok ? 'text-green-400' : 'text-red-400')}>{msg.text}</p>}
      <button type="submit" disabled={saving} className="btn-primary">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} שמור
      </button>
    </form>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function ReceiptsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('receipts');
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [receipts, setReceipts] = useState<ReceiptDTO[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(() => {
    fetch('/api/receipts/settings').then((r) => r.json()).then((d) => d.success && setSettings(d.data)).catch(() => {});
  }, []);

  useEffect(loadSettings, [loadSettings]);

  useEffect(() => {
    const url = tab === 'customers' ? '/api/customers' : '/api/receipts';
    if (tab === 'business') return;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`${url}?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) (tab === 'customers' ? setCustomers : setReceipts)(d.data); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [tab, query]);

  const activeTotal = receipts.filter((r) => r.status === 'ACTIVE').reduce((s, r) => s + r.amount, 0);
  const missingBusiness = settings && !settings.businessTaxId;

  const tabs: { key: Tab; label: string; icon: typeof ReceiptIcon }[] = [
    { key: 'receipts', label: 'קבלות', icon: ReceiptIcon },
    { key: 'customers', label: 'לקוחות', icon: Users },
    { key: 'business', label: 'פרטי העסק', icon: Building2 },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold">קבלות ולקוחות</h1>

      {missingBusiness && tab !== 'business' && (
        <button onClick={() => setTab('business')} className="w-full text-right card !p-4 border-amber-700/50 text-amber-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          לא הוגדר מספר עוסק – לחץ כאן כדי למלא את פרטי העסק שיופיעו על הקבלה
        </button>
      )}

      {tab !== 'business' && (
        <NewReceiptForm
          nextNumber={settings?.nextNumber ?? null}
          onIssued={(r) => { loadSettings(); router.push(`/receipts/${r.id}`); }}
        />
      )}

      <div className="flex items-center gap-1 border-b border-[var(--border)]">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setQuery(''); }}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            )}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'business' && settings && <BusinessForm settings={settings} onSaved={setSettings} />}

      {tab !== 'business' && (
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input className="input pr-9" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'customers' ? 'חיפוש לפי שם, טלפון או חברה' : 'חיפוש לפי שם, טלפון או מס׳ קבלה'} />
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
          ) : tab === 'receipts' ? (
            receipts.length === 0 ? (
              <p className="text-center text-[var(--text-muted)] py-10">אין קבלות עדיין</p>
            ) : (
              <div className="card !p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[var(--text-muted)] text-right">
                    <tr className="border-b border-[var(--border)]">
                      <th className="p-3 font-medium">מס׳</th>
                      <th className="p-3 font-medium">תאריך</th>
                      <th className="p-3 font-medium">לקוח</th>
                      <th className="p-3 font-medium hidden sm:table-cell">טלפון</th>
                      <th className="p-3 font-medium hidden md:table-cell">אמצעי תשלום</th>
                      <th className="p-3 font-medium">סכום</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((r) => (
                      <tr key={r.id} onClick={() => router.push(`/receipts/${r.id}`)}
                        className={clsx('border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface2)]', r.status === 'CANCELLED' && 'opacity-50')}>
                        <td className="p-3 font-mono">{r.number}</td>
                        <td className="p-3">{formatDate(r.issueDate)}</td>
                        <td className="p-3">
                          {r.customerName}
                          {r.customerCompany && <span className="text-[var(--text-muted)]"> · {r.customerCompany}</span>}
                          {r.status === 'CANCELLED' && <span className="badge-error mr-2">מבוטלת</span>}
                        </td>
                        <td className="p-3 hidden sm:table-cell" dir="ltr">{formatPhone(r.customerPhone)}</td>
                        <td className="p-3 hidden md:table-cell">{PAYMENT_METHODS[r.paymentMethod] ?? r.paymentMethod}</td>
                        <td className={clsx('p-3 font-medium', r.status === 'CANCELLED' && 'line-through')}>{formatAmount(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[var(--border)]">
                      <td colSpan={5} className="p-3 text-[var(--text-muted)]">סה״כ (ללא מבוטלות)</td>
                      <td className="p-3 font-semibold text-[var(--accent)]">{formatAmount(activeTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          ) : customers.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-10">לקוחות נוספים אוטומטית כשמפיקים קבלה</p>
          ) : (
            <div className="card !p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[var(--text-muted)] text-right">
                  <tr className="border-b border-[var(--border)]">
                    <th className="p-3 font-medium">שם</th>
                    <th className="p-3 font-medium">טלפון</th>
                    <th className="p-3 font-medium hidden sm:table-cell">חברה</th>
                    <th className="p-3 font-medium">קבלות</th>
                    <th className="p-3 font-medium">סה״כ</th>
                    <th className="p-3 font-medium hidden md:table-cell">אחרונה</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} onClick={() => { setTab('receipts'); setQuery(c.phone); }}
                      className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface2)]">
                      <td className="p-3">{c.fullName}</td>
                      <td className="p-3" dir="ltr">{formatPhone(c.phone)}</td>
                      <td className="p-3 hidden sm:table-cell">{c.company ?? '—'}</td>
                      <td className="p-3">{c.receiptCount}</td>
                      <td className="p-3 font-medium">{formatAmount(c.totalAmount)}</td>
                      <td className="p-3 hidden md:table-cell">{c.lastReceiptAt ? formatDate(c.lastReceiptAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
