import type { ReactNode } from 'react';

/** Standard screen header: title, optional subtitle, and actions (search / primary CTA). */
export default function PageHeader({ title, subtitle, actions }: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-[var(--text)] leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
