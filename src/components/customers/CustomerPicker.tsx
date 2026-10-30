'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Plus, Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { formatPhone } from '@/lib/customers';
import CustomerFormModal from './CustomerFormModal';
import type { CustomerListItem } from './types';

export interface PickedCustomer { id: string; name: string; phone?: string }

/**
 * Pick an existing customer (searchable) or create a new one in place.
 * Used by quotes, receipts and the gallery.
 */
export default function CustomerPicker({ value, onChange, placeholder = 'בחר לקוח', allowClear, id }: {
  value: PickedCustomer | null;
  onChange: (c: PickedCustomer | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const sp = new URLSearchParams({ limit: '20' });
        if (q.trim()) sp.set('q', q.trim());
        const data = await (await fetch(`/api/customers?${sp}`)).json();
        if (data.success) setResults(data.data);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Prefill the new-customer form from what was typed: digits → phone, text → name.
  const typedIsPhone = /^[\d\s+-]{7,}$/.test(q.trim());

  return (
    <div className="relative" ref={boxRef}>
      <div className="flex gap-2">
        <button
          id={id}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="input flex items-center justify-between text-start"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={clsx('truncate', !value && 'text-[var(--text-muted)]')}>
            {value ? value.name : placeholder}
            {value?.phone && <span className="text-[var(--text-muted)] text-xs ms-2" dir="ltr">{formatPhone(value.phone)}</span>}
          </span>
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        </button>
        {allowClear && value && (
          <button type="button" className="btn-ghost !px-2" onClick={() => onChange(null)} aria-label="נקה לקוח">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-40 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden">
          <div className="p-2 border-b border-[var(--border)] relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-5 text-[var(--text-muted)]" />
            <input className="input !py-2 ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם או טלפון" autoFocus aria-label="חיפוש לקוח" />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
            {loading && results.length === 0 && (
              <li className="px-4 py-3 text-sm text-[var(--text-muted)] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> מחפש…</li>
            )}
            {!loading && results.length === 0 && <li className="px-4 py-3 text-sm text-[var(--text-muted)]">לא נמצאו לקוחות</li>}
            {results.map((c) => (
              <li key={c.id} role="option" aria-selected={value?.id === c.id}>
                <button
                  type="button"
                  onClick={() => { onChange({ id: c.id, name: c.name, phone: c.phone }); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-start hover:bg-[var(--surface2)]"
                >
                  <span className="flex-1 truncate">{c.name}</span>
                  {c.phone && <span className="text-xs text-[var(--text-muted)]" dir="ltr">{formatPhone(c.phone)}</span>}
                  {value?.id === c.id && <Check className="w-4 h-4 text-[var(--accent)]" />}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => { setOpen(false); setCreating(true); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--accent)] border-t border-[var(--border)] hover:bg-[var(--surface2)]"
          >
            <Plus className="w-4 h-4" /> לקוח חדש{q.trim() && `: ${q.trim()}`}
          </button>
        </div>
      )}

      <CustomerFormModal
        open={creating}
        onClose={() => setCreating(false)}
        initial={q.trim() ? (typedIsPhone ? { phone: q.trim() } : { name: q.trim() }) : undefined}
        onCreated={(c) => onChange({ id: c.id, name: c.name, phone: c.phone })}
      />
    </div>
  );
}
