'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { PriceTier, QuoteLineInput } from '@/lib/quote-math';
import { formatILS } from '@/lib/money';
import MoneyInput from './MoneyInput';

const numOrNull = (v: string) => (v.trim() ? Math.max(1, Math.round(Number(v))) || null : null);

/** Per-person price tiers by guest count (bounds inclusive). */
export function TiersEditor({ tiers, onChange, guestCount, matched }: {
  tiers: PriceTier[];
  onChange: (t: PriceTier[]) => void;
  guestCount: number | null;
  matched: PriceTier | null;
}) {
  const set = (i: number, patch: Partial<PriceTier>) => onChange(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-[1fr_1fr_1.4fr_auto] gap-2 text-xs text-[var(--text-muted)] px-1">
        <span>ממשתתף</span><span>עד משתתף</span><span>מחיר לאדם</span><span className="w-8" />
      </div>
      {tiers.map((t, i) => {
        const active = matched === t || (matched && matched.min === t.min && matched.max === t.max && matched.price === t.price);
        return (
          <div key={i} className={`grid grid-cols-2 sm:grid-cols-[1fr_1fr_1.4fr_auto] gap-2 items-center rounded-xl p-1 ${active ? 'bg-[var(--accent-dim)]' : ''}`}>
            <input className="input" type="number" min={1} inputMode="numeric" placeholder="מ- (ריק = ללא)" aria-label={`מדרגה ${i + 1} מ-`}
              value={t.min ?? ''} onChange={(e) => set(i, { min: numOrNull(e.target.value) })} />
            <input className="input" type="number" min={1} inputMode="numeric" placeholder="עד (ריק = ללא)" aria-label={`מדרגה ${i + 1} עד`}
              value={t.max ?? ''} onChange={(e) => set(i, { max: numOrNull(e.target.value) })} />
            <MoneyInput value={t.price || null} onChange={(v) => set(i, { price: v ?? 0 })} ariaLabel={`מדרגה ${i + 1} מחיר לאדם`} className="col-span-2 sm:col-span-1" />
            <button type="button" className="btn-ghost !p-2 justify-self-end" onClick={() => onChange(tiers.filter((_, j) => j !== i))} aria-label="הסר מדרגה">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        {tiers.length < 10 && (
          <button type="button" className="btn-ghost !px-2" onClick={() => onChange([...tiers, { min: null, max: null, price: 0 }])}>
            <Plus className="w-4 h-4" /> הוסף מדרגה
          </button>
        )}
        {guestCount && matched && (
          <span className="text-xs text-[var(--text-muted)]">{guestCount} אורחים × {formatILS(matched.price)} = {formatILS(matched.price * guestCount)}</span>
        )}
      </div>
    </div>
  );
}

/** Free line items (extras, services). */
export function ItemsEditor({ items, onChange, savedServices = [] }: {
  items: QuoteLineInput[];
  onChange: (items: QuoteLineInput[]) => void;
  savedServices?: { description: string; unitPrice: number }[];
}) {
  const set = (i: number, patch: Partial<QuoteLineInput>) => onChange(items.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="hidden sm:grid grid-cols-[2.4fr_0.8fr_1.2fr_1fr_auto] gap-2 text-xs text-[var(--text-muted)] px-1">
          <span>תיאור</span><span>כמות</span><span>מחיר יחידה</span><span>סה"כ</span><span className="w-8" />
        </div>
      )}
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[2.4fr_0.8fr_1.2fr_1fr_auto] gap-2 items-center border-b sm:border-0 border-[var(--border)] pb-2 sm:pb-0">
          <input className="input" placeholder="לדוגמה: שעה נוספת" aria-label={`שורה ${i + 1} תיאור`} value={it.description}
            onChange={(e) => set(i, { description: e.target.value })} />
          <button type="button" className="btn-ghost !p-2 sm:order-last" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="הסר שורה">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="col-span-2 sm:col-span-1 grid grid-cols-3 sm:contents gap-2">
            <input className="input tabular-nums" type="number" min={0} step="any" inputMode="decimal" aria-label={`שורה ${i + 1} כמות`}
              value={it.quantity} onChange={(e) => set(i, { quantity: Number(e.target.value) || 0 })} />
            <MoneyInput value={it.unitPrice || null} onChange={(v) => set(i, { unitPrice: v ?? 0 })} ariaLabel={`שורה ${i + 1} מחיר`} />
            <span className="text-sm tabular-nums self-center">{formatILS(Math.round((it.quantity || 0) * it.unitPrice))}</span>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost !px-2" onClick={() => onChange([...items, { description: '', quantity: 1, unitPrice: 0 }])}>
          <Plus className="w-4 h-4" /> הוסף שורה
        </button>
        {savedServices.map((s) => (
          <button key={s.description} type="button" className="badge tone-neutral hover:tone-accent cursor-pointer"
            onClick={() => onChange([...items, { description: s.description, quantity: 1, unitPrice: s.unitPrice }])}>
            + {s.description}
          </button>
        ))}
      </div>
    </div>
  );
}
