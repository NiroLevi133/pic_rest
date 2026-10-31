/** Business dates are Israeli dates, regardless of the server's time zone. */
export const TZ = 'Asia/Jerusalem';

function offsetMinutes(at: Date): number {
  const s = at.toLocaleString('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' });
  const m = /GMT([+-])(\d+)(?::(\d+))?/.exec(s);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** Start (or end) of an Israeli calendar day "yyyy-mm-dd" as a UTC instant. */
export function israelDayBoundary(day: string, end = false): Date {
  const utc = new Date(`${day}T${end ? '23:59:59.999' : '00:00:00.000'}Z`);
  return new Date(utc.getTime() - offsetMinutes(utc) * 60_000);
}

/** "dd.mm.yyyy" in Israel time */
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('he-IL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString('he-IL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Date-only values ("yyyy-mm-dd" stored as UTC midnight) → "dd.mm.yyyy" without TZ shifting. */
export function formatDay(value: string | Date | null | undefined): string {
  if (!value) return '';
  const iso = typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** Today's date in Israel as yyyy-mm-dd */
export function israelToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}
