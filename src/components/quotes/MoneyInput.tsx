'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { agorotToInput, parseShekels } from '@/lib/money';

/** Shekel amount input that reports integer agorot (null when empty). */
export default function MoneyInput({ value, onChange, id, placeholder = '0', className, invalid, ariaLabel }: {
  value: number | null;
  onChange: (agorot: number | null) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(agorotToInput(value));

  // Follow external changes (e.g. quick-fill buttons) without fighting the user's typing.
  useEffect(() => {
    if (parseShekels(text) !== (value ?? null)) setText(agorotToInput(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={clsx('relative', className)}>
      <input
        id={id}
        inputMode="decimal"
        dir="ltr"
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={clsx('input ps-7 tabular-nums', invalid && '!border-[var(--error)]')}
        style={{ textAlign: 'right' }}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,]/g, '');
          setText(t);
          const parsed = parseShekels(t);
          if (parsed !== null || t === '') onChange(parsed);
        }}
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)] pointer-events-none">₪</span>
    </div>
  );
}
