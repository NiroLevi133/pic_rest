'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { NIRO_BAR_DEFAULT_FEATURES, type NiroBarFeatureTemplate } from '@/lib/style-presets';
import type { NiroFeature } from '@/lib/quotes';

interface Row { key: string; selected: boolean; title: string; description: string }

function fromTemplate(t: NiroBarFeatureTemplate, selected: boolean): Row {
  return { key: t.id, selected, title: t.titleTemplate.replace('{N}', t.defaultNumber ?? '').trim(), description: t.description };
}

/**
 * The "מה מחכה לכם?" checklist of the NIRO BAR template — same built-in items
 * and per-account custom items as the original studio form.
 */
export default function NiroFeaturesEditor({ value, onChange, seedDefaults }: {
  value: NiroFeature[];
  onChange: (features: NiroFeature[]) => void;
  /** New quote: start with every built-in item selected */
  seedDefaults: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() => {
    if (seedDefaults && value.length === 0) return NIRO_BAR_DEFAULT_FEATURES.map((t) => fromTemplate(t, true));
    const selected = value.map((f, i) => ({ key: `sel_${i}`, selected: true, ...f }));
    const titles = new Set(value.map((f) => f.title));
    const rest = NIRO_BAR_DEFAULT_FEATURES.map((t) => fromTemplate(t, false)).filter((r) => !titles.has(r.title));
    return [...selected, ...rest];
  });
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const first = useRef(true);

  // Custom items saved to the account (shared with the old studio form).
  useEffect(() => {
    fetch('/api/settings/niro-bar-features').then((r) => r.json()).then((d) => {
      if (!d.success || !Array.isArray(d.data)) return;
      setRows((prev) => {
        const titles = new Set(prev.map((r) => r.title));
        return [...prev, ...(d.data as NiroBarFeatureTemplate[]).map((t) => fromTemplate(t, false)).filter((r) => !titles.has(r.title))];
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (!(seedDefaults && value.length === 0)) return;
    }
    onChange(rows.filter((r) => r.selected && r.title.trim()).map((r) => ({ title: r.title.trim(), description: r.description.trim() })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const set = (i: number, patch: Partial<Row>) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function addFeature() {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/niro-bar-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleTemplate: newTitle.trim(), description: newDescription.trim(), hasNumber: false }),
      });
      const d = await res.json();
      const added = d.success && Array.isArray(d.data) ? (d.data[d.data.length - 1] as NiroBarFeatureTemplate) : null;
      setRows((prev) => [...prev, added ? fromTemplate(added, true) : { key: `new_${Date.now()}`, selected: true, title: newTitle.trim(), description: newDescription.trim() }]);
      setAdding(false);
      setNewTitle('');
      setNewDescription('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={row.key} className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border ${row.selected ? 'border-[var(--accent)]/40 bg-[var(--accent-dim)]' : 'border-[var(--border)]'}`}>
          <input type="checkbox" checked={row.selected} onChange={(e) => set(i, { selected: e.target.checked })}
            className="w-4 h-4 mt-2.5 accent-[var(--accent)] shrink-0" aria-label={`לכלול: ${row.title}`} />
          <div className="flex-1 min-w-0 space-y-1">
            <input className="input text-sm font-medium !py-1.5" value={row.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="כותרת" aria-label="כותרת הסעיף" />
            <input className="input text-xs !py-1" value={row.description} onChange={(e) => set(i, { description: e.target.value })} placeholder="תת-כותרת (אופציונלי)" aria-label="תיאור הסעיף" />
          </div>
        </div>
      ))}
      {!adding ? (
        <button type="button" className="btn-ghost !px-2" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> הוסף סעיף חדש</button>
      ) : (
        <div className="p-3 rounded-xl border border-[var(--border)] space-y-2">
          <input className="input text-sm" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="כותרת הסעיף" aria-label="כותרת סעיף חדש" />
          <input className="input text-sm" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="תיאור קצר (אופציונלי)" aria-label="תיאור סעיף חדש" />
          <p className="text-xs text-[var(--text-muted)]">הסעיף יישמר בחשבון ויופיע גם בהצעות הבאות.</p>
          <div className="flex gap-2">
            <button type="button" className="btn-primary !py-1.5" onClick={addFeature} disabled={saving || !newTitle.trim()}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} שמור והוסף
            </button>
            <button type="button" className="btn-ghost !py-1.5" onClick={() => setAdding(false)}>ביטול</button>
          </div>
        </div>
      )}
    </div>
  );
}
