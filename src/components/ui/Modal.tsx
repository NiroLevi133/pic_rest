'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'relative w-full bg-[var(--surface)] border border-[var(--border)] shadow-2xl',
          'rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col animate-reveal',
          { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-5xl' }[size],
        )}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
            <button onClick={onClose} className="btn-ghost !p-1.5" aria-label="סגור">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-[var(--border)] flex flex-wrap gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  );
}
