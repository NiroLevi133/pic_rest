'use client';

import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

export interface TabDef<K extends string> {
  key: K;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

export default function Tabs<K extends string>({ tabs, value, onChange }: {
  tabs: TabDef<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-[var(--border)] mb-6 overflow-x-auto scrollbar-hide" role="tablist">
      {tabs.map(({ key, label, icon: Icon, count }) => (
        <button
          key={key}
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer',
            value === key
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]',
          )}
        >
          {Icon && <Icon className="w-4 h-4" />}
          {label}
          {count !== undefined && <span className="text-xs opacity-70">({count})</span>}
        </button>
      ))}
    </div>
  );
}
