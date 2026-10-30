import { clsx } from 'clsx';

export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'accent';

/** Every status in the system maps to one label + tone, so colors stay consistent everywhere. */
const STATUSES: Record<string, { label: string; tone: Tone }> = {
  // generation
  PENDING:    { label: 'ממתין', tone: 'neutral' },
  GENERATING: { label: 'בתהליך', tone: 'warning' },
  DONE:       { label: 'הושלם', tone: 'success' },
  ERROR:      { label: 'שגיאה', tone: 'danger' },
  // customers
  LEAD:       { label: 'ליד', tone: 'neutral' },
  QUOTE_SENT: { label: 'הצעה נשלחה', tone: 'info' },
  ACTIVE:     { label: 'לקוח פעיל', tone: 'success' },
  INACTIVE:   { label: 'לא פעיל', tone: 'neutral' },
  // quotes
  DRAFT:      { label: 'טיוטה', tone: 'neutral' },
  SENT:       { label: 'נשלחה', tone: 'info' },
  APPROVED:   { label: 'אושרה', tone: 'success' },
  REJECTED:   { label: 'נדחתה', tone: 'danger' },
  EXPIRED:    { label: 'פג תוקף', tone: 'warning' },
  // receipts
  ISSUED:     { label: 'הופקה', tone: 'success' },
  CANCELLED:  { label: 'בוטלה', tone: 'danger' },
};

export function statusLabel(status: string): string {
  return STATUSES[status]?.label ?? status;
}

export default function StatusBadge({ status, label, tone }: { status?: string; label?: string; tone?: Tone }) {
  const def = status ? STATUSES[status] : undefined;
  const t = tone ?? def?.tone ?? 'neutral';
  return (
    <span className={clsx('badge whitespace-nowrap', `tone-${t}`, status === 'GENERATING' && 'animate-pulse')}>
      {label ?? def?.label ?? status}
    </span>
  );
}
