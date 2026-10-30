import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export default function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center text-center py-14">
      <div className="w-12 h-12 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[var(--accent)]" />
      </div>
      <p className="font-semibold text-[var(--text)]">{title}</p>
      {description && <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
