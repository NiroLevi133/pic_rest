'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🍽️</div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Restorante AI</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>מחולל תמונות מנות חכם</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold mb-1 text-right" style={{ color: 'var(--text)' }}>כניסה למערכת</h2>
          <p className="text-sm mb-6 text-right" style={{ color: 'var(--text-muted)' }}>הכנס מספר טלפון כדי להתחיל</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label text-right block" style={{ color: 'var(--text-muted)' }}>
                מספר טלפון
              </label>
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
              <div
                className="rounded-lg px-4 py-3 text-sm text-right"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: 'var(--error)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, '').length < 9}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  מתחבר...
                </>
              ) : (
                'כניסה'
              )}
            </button>
          </form>

          <p className="text-xs text-center mt-6" style={{ color: 'var(--text-muted)' }}>
             המספר שלך הוא המזהה שלך
          </p>
        </div>
      </div>
    </div>
  );
}
