/** Hebrew status labels usable on the server (the UI badge has its own copy with colors). */
const LABELS: Record<string, string> = {
  DRAFT: 'טיוטה', SENT: 'נשלחה', APPROVED: 'אושרה', REJECTED: 'נדחתה', EXPIRED: 'פג תוקף',
  ISSUED: 'הופקה', CANCELLED: 'בוטלה',
};
export function statusLabelHe(status: string): string {
  return LABELS[status] ?? status;
}
