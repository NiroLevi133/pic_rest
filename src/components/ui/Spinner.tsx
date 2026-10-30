import { Loader2 } from 'lucide-react';

export default function Spinner({ label = 'טוען…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-[var(--text-muted)] text-sm">
      <Loader2 className="w-5 h-5 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/30 tone-danger px-4 py-3 text-sm flex items-center justify-between gap-3">
      <span>{message}</span>
      {onRetry && <button className="btn-ghost !py-1" onClick={onRetry}>נסה שוב</button>}
    </div>
  );
}
