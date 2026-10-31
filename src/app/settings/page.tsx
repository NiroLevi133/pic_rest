'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save, Loader2, Eye, EyeOff, CheckCircle, ChevronDown, ChevronUp,
  User, LogOut, Camera,
} from 'lucide-react';
import type { SafeSettings, AppSettings, LLMProvider } from '@/lib/types';
import BusinessProfileForm from '@/components/business/BusinessProfileForm';

/* ── Reusable components ─────────────────────────────────────────── */
function KeyInput({ label, name, placeholder, value, onChange, hasKey }: {
  label: string; name: string; placeholder: string;
  value: string; onChange: (v: string) => void; hasKey: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="label mb-0 text-sm">{label}</label>
        {hasKey && !value && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle className="w-3 h-3" /> שמור
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="input pr-10 text-sm"
          name={name}
          placeholder={hasKey ? '••••••••••••• (שמור)' : placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete="off"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children, accent }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`card ${accent ? 'border-[var(--accent)]/30' : ''}`}>
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)]">
          {icon}
        </div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const LLM_PROVIDERS: { id: LLMProvider; label: string }[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'gemini', label: 'Google Gemini' },
];

/* ── Main page ───────────────────────────────────────────────────── */
export default function SettingsPage() {
  const router = useRouter();

  /* Account */
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [generatedCount, setGeneratedCount] = useState(0);

  /* AI settings */
  const [aiOpen, setAiOpen] = useState(false);
  const [safeSettings, setSafeSettings] = useState<SafeSettings | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiError, setAiError] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('openai');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o');
  const [anthropicModel, setAnthropicModel] = useState('claude-sonnet-4-6');
  const [geminiLlmModel, setGeminiLlmModel] = useState('gemini-2.5-flash');
  const [geminiImageModel, setGeminiImageModel] = useState('gemini-2.0-flash-exp');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [concurrency, setConcurrency] = useState(3);

  /* Load profile */
  useEffect(() => {
    fetch('/api/auth/profile')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setPhone(d.data.phone || '');
          setRole(d.data.role || '');
          setGeneratedCount(d.data.generatedCount || 0);
        }
      });
  }, []);

  /* Load AI settings (only when section opens) */
  useEffect(() => {
    if (!aiOpen || safeSettings) return;
    setAiLoading(true);
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const s: SafeSettings = d.data;
          setSafeSettings(s);
          setLlmProvider(s.llmProvider ?? 'openai');
          setOpenaiModel(s.openaiModel ?? 'gpt-4o');
          setAnthropicModel(s.anthropicModel ?? 'claude-sonnet-4-6');
          setGeminiLlmModel(s.geminiLlmModel ?? 'gemini-2.5-flash');
          setGeminiImageModel(s.geminiImageModel ?? 'gemini-2.0-flash-exp');
          setImageSize(s.imageSize ?? '1024x1024');
          setConcurrency(s.concurrency ?? 3);
        }
      })
      .finally(() => setAiLoading(false));
  }, [aiOpen, safeSettings]);

  async function saveAiSettings(e: React.FormEvent) {
    e.preventDefault();
    setAiSaving(true); setAiError(''); setAiSaved(false);
    const updates: Partial<AppSettings> = {
      llmProvider, openaiModel, anthropicModel,
      geminiLlmModel, geminiImageModel, imageSize, concurrency,
    };
    if (openaiKey) updates.openaiApiKey = openaiKey;
    if (anthropicKey) updates.anthropicApiKey = anthropicKey;
    if (googleKey) updates.googleApiKey = googleKey;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSafeSettings(data.data);
      setAiSaved(true);
      setOpenaiKey(''); setAnthropicKey(''); setGoogleKey('');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'שגיאה');
    } finally {
      setAiSaving(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5" dir="rtl">
      {/* ── 1. Business details (used on quotes and receipts) ─────── */}
      {(role === 'OWNER' || role === 'MEMBER') && (
        <section>
          <h1 className="text-xl font-bold">הגדרות</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 mb-4">פרטי העסק מופיעים בכל הצעת מחיר וקבלה חדשה. קבלות שכבר הופקו לא משתנות.</p>
          <BusinessProfileForm />
        </section>
      )}

      {/* ── 2. AI Settings (collapsible) ─────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <button
          type="button"
          onClick={() => setAiOpen(!aiOpen)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--surface2)]/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)]">
              <Camera className="w-4 h-4" />
            </div>
            <div className="text-right">
              <p className="font-semibold text-sm">הגדרות AI</p>
              <p className="text-xs text-[var(--text-muted)]">API keys, מודלים וספקים</p>
            </div>
          </div>
          {aiOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
        </button>

        {aiOpen && (
          <div className="border-t border-[var(--border)] px-5 py-5">
            {aiLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" /></div>
            ) : (
              <form onSubmit={saveAiSettings} className="space-y-5">
                {/* LLM Provider */}
                <div>
                  <p className="text-sm font-medium mb-3">LLM Provider (ניתוח תפריט)</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {LLM_PROVIDERS.map(({ id, label }) => (
                      <button key={id} type="button"
                        className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${llmProvider === id ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--text-muted)]'}`}
                        onClick={() => setLlmProvider(id)}>{label}</button>
                    ))}
                  </div>
                  {llmProvider === 'openai' && (
                    <div className="space-y-2">
                      <KeyInput label="OpenAI API Key" name="openaiKey" placeholder="sk-..." value={openaiKey} onChange={setOpenaiKey} hasKey={safeSettings?.hasOpenaiKey ?? false} />
                      <div>
                        <label className="label text-sm mb-1">מודל</label>
                        <select className="input text-sm" value={openaiModel} onChange={e => setOpenaiModel(e.target.value)}>
                          <option value="gpt-4o">GPT-4o</option>
                          <option value="gpt-4o-mini">GPT-4o Mini</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {llmProvider === 'anthropic' && (
                    <div className="space-y-2">
                      <KeyInput label="Anthropic API Key" name="anthropicKey" placeholder="sk-ant-..." value={anthropicKey} onChange={setAnthropicKey} hasKey={safeSettings?.hasAnthropicKey ?? false} />
                      <div>
                        <label className="label text-sm mb-1">מודל</label>
                        <select className="input text-sm" value={anthropicModel} onChange={e => setAnthropicModel(e.target.value)}>
                          <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                          <option value="claude-opus-4-6">Claude Opus 4.6</option>
                          <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {llmProvider === 'gemini' && (
                    <div className="space-y-2">
                      <KeyInput label="Google API Key" name="googleKey" placeholder="AIza..." value={googleKey} onChange={setGoogleKey} hasKey={safeSettings?.hasGoogleKey ?? false} />
                      <div>
                        <label className="label text-sm mb-1">מודל Gemini</label>
                        <input className="input text-sm font-mono" value={geminiLlmModel} onChange={e => setGeminiLlmModel(e.target.value)} placeholder="gemini-2.5-flash" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Image Generation (Gemini – hardcoded) */}
                <div>
                  <p className="text-sm font-medium mb-3">Image Generation (Gemini)</p>
                  <div className="space-y-2">
                    <KeyInput label="Google API Key" name="googleKey" placeholder="AIza..." value={googleKey} onChange={setGoogleKey} hasKey={safeSettings?.hasGoogleKey ?? false} />
                    <div>
                      <label className="label text-sm mb-1">מודל Gemini Image</label>
                      <input className="input text-sm font-mono" value={geminiImageModel} onChange={e => setGeminiImageModel(e.target.value)} placeholder="gemini-2.0-flash-preview-image-generation" />
                    </div>
                  </div>
                </div>

                {/* Image size + concurrency */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label text-sm mb-1">גודל תמונה</label>
                    <select className="input text-sm" value={imageSize} onChange={e => setImageSize(e.target.value)}>
                      <option value="1024x1024">1024×1024</option>
                      <option value="1792x1024">1792×1024</option>
                      <option value="1024x1792">1024×1792</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-sm mb-1">מקביליות</label>
                    <input type="number" min={1} max={10} className="input text-sm" value={concurrency} onChange={e => setConcurrency(Number(e.target.value))} />
                  </div>
                </div>

                {aiError && (
                  <div className="rounded-lg bg-red-900/20 border border-red-900/50 px-3 py-2 text-red-400 text-sm">{aiError}</div>
                )}

                <button type="submit" disabled={aiSaving} className="btn-primary gap-2">
                  {aiSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</>
                    : aiSaved ? <><CheckCircle className="w-4 h-4" /> נשמר!</>
                    : <><Save className="w-4 h-4" /> שמור הגדרות AI</>}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── 3. Account management ────────────────────────────────── */}
      <Section title="ניהול חשבון" icon={<User className="w-4 h-4" />}>
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[var(--surface2)] rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-[var(--accent)]">{generatedCount}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">תמונות שנוצרו</div>
          </div>
          <div className="bg-[var(--surface2)] rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">∞</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">תמונות שנותרו</div>
          </div>
        </div>

        {/* Phone */}
        {phone && (
          <div className="flex items-center justify-between py-3 border-t border-[var(--border)]">
            <span className="text-sm text-[var(--text-muted)]">מספר טלפון</span>
            <span className="text-sm font-mono" dir="ltr">{phone}</span>
          </div>
        )}

        {/* Admin link */}
        {role === 'OWNER' && (
          <div className="border-t border-[var(--border)] pt-4 mt-2 space-y-2">
            <a
              href="/admin"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors text-sm font-medium"
            >
              <User className="w-4 h-4" /> ניהול משתמשים
            </a>
          </div>
        )}

        {/* Logout */}
        <div className="border-t border-[var(--border)] pt-4 mt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-900/50 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> יציאה מהמערכת
          </button>
        </div>
      </Section>
    </div>
  );
}
