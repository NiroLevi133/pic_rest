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
