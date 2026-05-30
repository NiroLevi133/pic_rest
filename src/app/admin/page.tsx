'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type UserRow = {
  id: string;
  phone: string;
  restaurantName: string | null;
  canSingleGenerate: boolean;
  canMultiGenerate: boolean;
  createdAt: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  // Image migration (base64 → Supabase Storage)
  const [migrating, setMigrating] = useState(false);
  const [migrateStatus, setMigrateStatus] = useState<string>('');

  async function runMigration() {
    setMigrating(true);
    setMigrateStatus('בודק...');
    let total = 0;
    let consecutiveFailures = 0;
    try {
      // Keep processing small batches until nothing base64 remains. Each
      // request is intentionally tiny so it can't hit the function timeout.
      for (;;) {
        let data: any = null;
        try {
          const res = await fetch('/api/admin/migrate-images?limit=4', { method: 'POST' });
          const text = await res.text();
          data = text ? JSON.parse(text) : null;
          if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
          if (!data) throw new Error('empty response');
        } catch (e) {
          // Timeout / empty body / transient error — retry a few times.
          consecutiveFailures++;
          if (consecutiveFailures >= 4) {
            setMigrateStatus(`נעצר אחרי ${total} תמונות — שגיאות חוזרות (${String(e)}). אפשר ללחוץ שוב להמשך.`);
            break;
          }
          setMigrateStatus(`הועברו ${total}... מנסה שוב (${consecutiveFailures})`);
          await new Promise(r => setTimeout(r, 1500 * consecutiveFailures));
          continue;
        }

        consecutiveFailures = 0;
        const moved = data.migrated || 0;
        total += moved;
        setMigrateStatus(`הועברו ${total} תמונות...`);
        if (!data.hasMore) { setMigrateStatus(`✅ הסתיים. סה"כ הועברו ${total} תמונות.`); break; }
        if (moved === 0) {
          setMigrateStatus(`נעצר — ${total} עברו, השאר לא הצליחו. ${(data.errors || []).slice(0, 2).join('; ')}`);
          break;
        }
      }
    } finally {
      setMigrating(false);
    }
  }

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => {
        if (r.status === 401) { setUnauthorized(true); return null; }
        return r.json();
      })
      .then(data => {
        if (data) setUsers(data.users);
        setLoading(false);
      });
  }, []);

  async function toggle(userId: string, field: 'canSingleGenerate' | 'canMultiGenerate', value: boolean) {
    setSaving(userId + field);
    const updated = users.map(u => u.id === userId ? { ...u, [field]: value } : u);
    setUsers(updated);
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canSingleGenerate: updated.find(u => u.id === userId)!.canSingleGenerate, canMultiGenerate: updated.find(u => u.id === userId)!.canMultiGenerate }),
    });
    setSaving(null);
  }

  if (unauthorized) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <p className="text-red-400 text-lg">אין הרשאה לעמוד זה</p>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <p className="text-gray-400">טוען...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">ניהול משתמשים</h1>

      <div className="mb-6 p-4 rounded-xl border border-gray-800 bg-gray-900/40">
        <h2 className="font-semibold mb-2">העברת תמונות לאחסון (CDN)</h2>
        <p className="text-gray-400 text-xs mb-3">מעביר תמונות שמורות במסד (base64) ל-Supabase Storage. ניתן להריץ שוב בבטחה.</p>
        <button
          onClick={runMigration}
          disabled={migrating}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium"
        >
          {migrating ? 'מעביר...' : 'הרץ העברה'}
        </button>
        {migrateStatus && <p className="text-sm mt-3 text-gray-300">{migrateStatus}</p>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              <th className="text-right px-4 py-3">שם</th>
              <th className="text-right px-4 py-3">טלפון</th>
              <th className="text-center px-4 py-3">גנרציה בודדת</th>
              <th className="text-center px-4 py-3">בחירה מרובה</th>
              <th className="text-right px-4 py-3">נרשם</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-900/20'}>
                <td className="px-4 py-3 font-medium">{u.restaurantName || '—'}</td>
                <td className="px-4 py-3 text-gray-300 font-mono">{u.phone}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggle(u.id, 'canSingleGenerate', !u.canSingleGenerate)}
                    disabled={saving === u.id + 'canSingleGenerate'}
                    className={`w-12 h-6 rounded-full transition-colors ${u.canSingleGenerate ? 'bg-green-500' : 'bg-gray-600'}`}
                  >
                    <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${u.canSingleGenerate ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggle(u.id, 'canMultiGenerate', !u.canMultiGenerate)}
                    disabled={saving === u.id + 'canMultiGenerate'}
                    className={`w-12 h-6 rounded-full transition-colors ${u.canMultiGenerate ? 'bg-purple-500' : 'bg-gray-600'}`}
                  >
                    <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${u.canMultiGenerate ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString('he-IL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-center text-gray-500 py-8">אין משתמשים עדיין</p>
        )}
      </div>
    </div>
  );
}
