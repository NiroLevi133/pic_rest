'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UtensilsCrossed } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'שגיאה בהתחברות');
      } else {
        router.push('/menu');
        router.refresh();
      }
    } catch {
      setError('שגיאת רשת, נסה שוב');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Warm ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(200,150,42,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-sm relative">

        {/* Brand */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent)] mb-5"
            style={{ boxShadow: '0 8px 32px rgba(200,150,42,0.22)' }}
          >
            <UtensilsCrossed className="w-8 h-8 text-[#0C0A09]" />
          </div>
          <h1
            className="text-[28px] font-bold tracking-tight text-[var(--text)]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Restorante AI
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">מחולל תמונות מנות חכם</p>
        </div>

        {/* Form card */}
        <div className="card p-8">
          <h2
            className="text-xl font-semibold mb-1 text-right text-[var(--text)]"
          >
            כניסה למערכת
          </h2>
          <p className="text-sm mb-7 text-right text-[var(--text-muted)]">
            הכנס מספר טלפון כדי להתחיל
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label text-right block">מספר טלפון</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-0000000"
                dir="ltr"
                className="input text-center text-lg tracking-widest"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm text-right bg-red-500/8 border border-red-500/20 text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, '').length < 9}
              className="btn-primary w-full justify-center py-3.5 text-[15px] mt-1"
              style={{ boxShadow: '0 4px 16px rgba(200,150,42,0.18)' }}
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> מתחבר...</>
              ) : (
                'כניסה'
              )}
            </button>
          </form>

          <p className="text-xs text-center mt-6 text-[var(--text-muted)]">
            המספר שלך הוא המזהה שלך
          </p>
        </div>

      </div>
    </div>
  );
}
