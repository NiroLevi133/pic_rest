import type { Receipt } from '@prisma/client';

export const PAYMENT_METHODS: Record<string, string> = {
  cash: 'מזומן',
  bit: 'ביט',
  paybox: 'פייבוקס',
  transfer: 'העברה בנקאית',
  check: 'צ׳ק',
  credit: 'כרטיס אשראי',
  other: 'אחר',
};

export const BUSINESS_TYPES: Record<string, string> = {
  exempt: 'עוסק פטור',
  licensed: 'עוסק מורשה',
  company: 'חברה בע״מ',
};

/** Digits only, same as login phone normalisation */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function formatPhone(p: string): string {
  return p.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3').replace(/^(\d{2})(\d{3})(\d{4})$/, '$1-$2-$3');
}

export function formatAmount(n: number): string {
  return '₪' + n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Empty string → null, trims everything else */
export function opt(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t : null;
}

export function serializeReceipt(r: Receipt) {
  return {
    ...r,
    amount: Number(r.amount),
    issueDate: r.issueDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
  };
}

export type ReceiptDTO = ReturnType<typeof serializeReceipt>;
