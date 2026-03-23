'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🍽️</div>
          <h1 className="text-3xl font-bold text-white">Restorante AI</h1>
          <p className="text-gray-400 mt-2 text-sm">מחולל תמונות מנות חכם</p>
        </div>

        {/* Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white text-xl font-semibold mb-1 text-right">כניסה למערכת</h2>
          <p className="text-gray-400 text-sm mb-6 text-right">הכנס מספר טלפון כדי להתחיל</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2 text-right">
                מספר טלפון
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-0000000"
                dir="ltr"
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm text-right">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, '').length < 9}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  מתחבר...
                </span>
              ) : (
                'כניסה'
              )}
            </button>
          </form>

          <p className="text-gray-500 text-xs text-center mt-6">
            אין צורך בסיסמה – המספר שלך הוא המזהה שלך
          </p>
        </div>
      </div>
    </div>
  );
}
