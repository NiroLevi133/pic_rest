'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { Building2, CheckCircle, Download, Eye, EyeOff, Loader2, LogOut, Save, Sparkles, User, Users } from 'lucide-react';
import type { SafeSettings, AppSettings, LLMProvider } from '@/lib/types';
import { useCurrentUser, hasBusinessAccess } from '@/components/CurrentUser';
import BusinessProfileForm from '@/components/business/BusinessProfileForm';
import Tabs from '@/components/ui/Tabs';
import Spinner, { ErrorBox } from '@/components/ui/Spinner';

type TabKey = 'business' | 'ai' | 'account';

const ROLE_LABELS: Record<string, string> = { OWNER: 'בעל העסק', MEMBER: 'משתמש עסקי', STUDIO_ONLY: 'סטודיו בלבד' };

function KeyInput({ label, value, onChange, hasKey, placeholder, id }: {
  label: string; value: string; onChange: (v: string) => void; hasKey: boolean; placeholder: string; id: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="label !mb-0" htmlFor={id}>{label}</label>
        {hasKey && !value && <span className="flex items-center gap-1 text-xs text-[var(--success)]"><CheckCircle className="w-3 h-3" /> מוגדר</span>}
      </div>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} className="input pe-10 font-mono text-sm" dir="ltr" autoComplete="off"
          placeholder={hasKey ? '••••••••••••' : placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" onClick={() => setShow(!show)} aria-label={show ? 'הסתר' : 'הצג'}>
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function Choice<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { key: T; label: string; hint?: string }[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {options.map((o) => (
        <button key={o.key} type="button" aria-pressed={value === o.key} onClick={() => onChange(o.key)}
          className={clsx('text-start rounded-xl border p-3 transition-colors', value === o.key ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)] hover:bg-[var(--surface2)]')}>
          <span className={clsx('block text-sm font-medium', value === o.key && 'text-[var(--accent)]')}>{o.label}</span>
          {o.hint && <span className="block text-xs text-[var(--text-muted)] mt-0.5">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

/** AI keys and engines — owner only. */
function AiSettings() {
  const [s, setS] = useState<SafeSettings | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [googleKey, setGoogleKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [form, setForm] = useState<Partial<AppSettings>>({});

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => {
      if (!d.success) { setError(d.error || 'טעינה נכשלה'); return; }
      setS(d.data);
      setForm({
        quoteDesignEngine: d.data.quoteDesignEngine ?? 'openai',
        llmProvider: d.data.llmProvider,
        geminiImageModel: d.data.geminiImageModel,
        openaiImageModel: d.data.openaiImageModel ?? 'gpt-image-2',
      });
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    const updates: Partial<AppSettings> = { ...form };
    if (googleKey) updates.googleApiKey = googleKey.trim();
    if (openaiKey) updates.openaiApiKey = openaiKey.trim();
    try {
      const d = await (await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })).json();
      if (!d.success) throw new Error(d.error);
      setS(d.data); setSaved(true); setGoogleKey(''); setOpenaiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה');
    } finally {
      setSaving(false);
    }
  }

  if (error && !s) return <ErrorBox message={error} />;
  if (!s) return <Spinner />;
  const set = (patch: Partial<AppSettings>) => { setForm({ ...form, ...patch }); setSaved(false); };

  return (
    <form onSubmit={save} className="space-y-5">
      <section className="card space-y-3">
        <h2 className="font-semibold">מנוע להצעת מחיר מעוצבת</h2>
        <Choice value={form.quoteDesignEngine ?? 'openai'} onChange={(v) => set({ quoteDesignEngine: v })} options={[
          { key: 'openai', label: 'GPT (מומלץ)', hint: 'עברית מדויקת יותר בתוך התמונה. כ-1–3 דקות.' },
          { key: 'gemini', label: 'Gemini', hint: 'המנוע המקורי. מהיר וזול יותר.' },
        ]} />
        {form.quoteDesignEngine !== 'gemini' && !s.hasOpenaiKey && <p className="text-xs text-[var(--warning)]">אין מפתח OpenAI — ההצעה המעוצבת תיווצר ב-Gemini עד שתוסיף מפתח.</p>}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">מפתחות</h2>
        <KeyInput id="k-google" label="Google (Gemini) — תמונות בסטודיו וסרטוני 360°" value={googleKey} onChange={setGoogleKey} hasKey={s.hasGoogleKey} placeholder="AIza…" />
        <KeyInput id="k-openai" label="OpenAI — הצעה מעוצבת וניתוח תמונת רפרנס" value={openaiKey} onChange={setOpenaiKey} hasKey={s.hasOpenaiKey} placeholder="sk-…" />
        <p className="text-xs text-[var(--text-muted)]">מפתחות שנשמרים כאן מוצפנים ועוקפים את המפתחות שבהגדרות השרת.</p>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">מתקדם</h2>
        <div>
          <p className="label">כתיבת טקסטים (כיתוב לאינסטגרם)</p>
          <Choice<LLMProvider> value={form.llmProvider ?? 'gemini'} onChange={(v) => set({ llmProvider: v })} options={[
            { key: 'gemini', label: 'Gemini' },
            { key: 'openai', label: 'GPT' },
          ]} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="m-gemini">מודל תמונות Gemini</label>
            <input id="m-gemini" className="input font-mono text-sm" dir="ltr" value={form.geminiImageModel ?? ''} onChange={(e) => set({ geminiImageModel: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="m-openai">מודל תמונות GPT</label>
            <input id="m-openai" className="input font-mono text-sm" dir="ltr" value={form.openaiImageModel ?? ''} onChange={(e) => set({ openaiImageModel: e.target.value })} />
          </div>
        </div>
      </section>

      {error && <ErrorBox message={error} />}
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-[var(--success)] inline-flex items-center gap-1"><CheckCircle className="w-4 h-4" /> נשמר</span>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} שמירה
        </button>
      </div>
    </form>
  );
}

function Account() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/auth/profile').then((r) => r.json()).then((d) => d.success && setCount(d.data.generatedCount ?? 0));
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="card">
        <dl className="grid sm:grid-cols-3 gap-4 text-sm">
          <div><dt className="text-xs text-[var(--text-muted)]">טלפון</dt><dd className="font-medium mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>{user?.phone}</dd></div>
          <div><dt className="text-xs text-[var(--text-muted)]">הרשאה</dt><dd className="font-medium mt-0.5">{ROLE_LABELS[user?.role ?? ''] ?? '—'}</dd></div>
          <div><dt className="text-xs text-[var(--text-muted)]">תמונות שיצרת</dt><dd className="font-medium mt-0.5">{count ?? '…'}</dd></div>
        </dl>
      </section>

      {user?.role === 'OWNER' && (
        <section className="card space-y-3">
          <h2 className="font-semibold">ניהול</h2>
          <div className="flex flex-wrap gap-2">
            <a href="/admin" className="btn-secondary"><Users className="w-4 h-4" /> ניהול משתמשים והרשאות</a>
            <a href="/api/export" className="btn-secondary"><Download className="w-4 h-4" /> ייצוא כל הנתונים (JSON)</a>
          </div>
          <p className="text-xs text-[var(--text-muted)]">הייצוא כולל פרטי עסק, לקוחות, הצעות, קבלות ויומן פעולות — לגיבוי או להעברה לרואה החשבון.</p>
        </section>
      )}

      <button type="button" onClick={logout} className="btn-secondary text-[var(--error)]"><LogOut className="w-4 h-4" /> יציאה מהמערכת</button>
    </div>
  );
}

function SettingsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useCurrentUser();
  if (loading) return <Spinner />;

  const business = hasBusinessAccess(user);
  const tabs = [
    ...(business ? [{ key: 'business' as const, label: 'פרטי העסק', icon: Building2 }] : []),
    ...(user?.role === 'OWNER' ? [{ key: 'ai' as const, label: 'AI', icon: Sparkles }] : []),
    { key: 'account' as const, label: 'חשבון', icon: User },
  ];
  const requested = params.get('tab') as TabKey | null;
  const tab: TabKey = tabs.some((t) => t.key === requested) ? requested! : tabs[0].key;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-4">הגדרות</h1>
      <Tabs<TabKey> value={tab} onChange={(k) => router.replace(`/settings?tab=${k}`, { scroll: false })} tabs={tabs} />
      {tab === 'business' && (
        <>
          <p className="text-sm text-[var(--text-muted)] mb-4">הפרטים מופיעים בכל הצעת מחיר וקבלה חדשה. קבלות שכבר הופקו לא משתנות.</p>
          <BusinessProfileForm />
        </>
      )}
      {tab === 'ai' && <AiSettings />}
      {tab === 'account' && <Account />}
    </div>
  );
}

export default function SettingsPage() {
  return <Suspense fallback={<Spinner />}><SettingsContent /></Suspense>;
}
