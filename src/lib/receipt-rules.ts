/**
 * Mandatory-field rules for receipts (קבלה). Shared by the form (instant
 * feedback) and the API (authoritative check before a number is allocated).
 *
 * Required on every receipt:
 *  - title "קבלה" and a unique sequential number (allocated by the server)
 *  - business name and עוסק/ת.ז number
 *  - receipt date (issue time, set by the server)
 *  - payer name and address (address may be omitted only by explicit exemption)
 *  - amount received and what it was received for (מהות התקבול)
 *  - signature, or a computerized document — every receipt here is computerized
 *  - for cheques: cheque number, bank, branch and due date
 */

export const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'BIT', 'CREDIT', 'CHEQUE', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'מזומן',
  TRANSFER: 'העברה בנקאית',
  BIT: 'ביט / פייבוקס',
  CREDIT: 'כרטיס אשראי',
  CHEQUE: 'שיק',
  OTHER: 'אחר',
};

/** Label for the free "reference" field per method. */
export const PAYMENT_REFERENCE_LABELS: Record<PaymentMethod, string> = {
  CASH: 'הערה',
  TRANSFER: 'אסמכתא / מספר העברה',
  BIT: 'אסמכתא',
  CREDIT: '4 ספרות אחרונות / אישור',
  CHEQUE: 'הערה',
  OTHER: 'פירוט',
};

export interface PaymentLineDraft {
  method: PaymentMethod;
  /** agorot */
  amount: number;
  /** yyyy-mm-dd */
  receivedAt: string;
  reference: string;
  chequeNumber: string;
  chequeBank: string;
  chequeBranch: string;
  chequeAccount: string;
  /** yyyy-mm-dd */
  chequeDueDate: string;
}

export interface PayerDraft {
  name: string;
  taxId: string;
  address: string;
  /** Explicitly mark that the payer's address may be omitted under the legal exceptions */
  addressExempt: boolean;
  phone: string;
  email: string;
}

export interface ReceiptDraft {
  customerId: string;
  quoteId?: string | null;
  payer: PayerDraft;
  description: string;
  payments: PaymentLineDraft[];
  notes: string;
}

export interface BusinessForDocs {
  businessName: string;
  taxId: string;
  vatType: string;
  address: string;
}

export type FieldErrors = Record<string, string>;

export const MAX_PAYMENT_LINES = 12;

export function emptyPaymentLine(method: PaymentMethod = 'TRANSFER', today = isoDate(new Date())): PaymentLineDraft {
  return {
    method, amount: 0, receivedAt: today, reference: '',
    chequeNumber: '', chequeBank: '', chequeBranch: '', chequeAccount: '', chequeDueDate: '',
  };
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime()) && isoDate(d) === s;
}

/** Israeli ID / עוסק / ח.פ check digit (same algorithm for all three). */
export function isValidIsraeliId(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 5 || digits.length > 9) return false;
  const id = digits.padStart(9, '0');
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(id[i]) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0;
}

/** Business details that must exist before any receipt can be issued. */
export function validateBusinessForReceipts(b: BusinessForDocs | null | undefined): FieldErrors {
  const errors: FieldErrors = {};
  if (!b?.businessName?.trim()) errors.businessName = 'חסר שם העסק / שם העוסק';
  if (!b?.taxId?.trim()) errors.taxId = 'חסר מספר עוסק / ת.ז';
  else if (!isValidIsraeliId(b.taxId)) errors.taxId = 'מספר עוסק / ת.ז אינו תקין';
  if (!b?.address?.trim()) errors.address = 'חסרה כתובת העסק';
  return errors;
}

export function validateReceiptDraft(d: ReceiptDraft, today = isoDate(new Date())): FieldErrors {
  const errors: FieldErrors = {};

  if (!d.customerId) errors.customerId = 'יש לבחור לקוח';
  if (!d.payer.name.trim()) errors['payer.name'] = 'שם המשלם הוא שדה חובה';
  if (!d.payer.address.trim() && !d.payer.addressExempt) {
    errors['payer.address'] = 'כתובת המשלם היא שדה חובה (או סמן פטור לפי החריגים בחוק)';
  }
  if (d.payer.taxId.trim() && !/^\d{5,9}$/.test(d.payer.taxId.replace(/\D/g, ''))) {
    errors['payer.taxId'] = 'מספר מזהה לא תקין';
  }
  if (!d.description.trim()) errors.description = 'יש לציין את מהות התקבול — על מה התקבל הכסף';

  if (d.payments.length === 0) errors.payments = 'יש להוסיף לפחות אמצעי תשלום אחד';
  if (d.payments.length > MAX_PAYMENT_LINES) errors.payments = `עד ${MAX_PAYMENT_LINES} אמצעי תשלום בקבלה`;

  d.payments.forEach((p, i) => {
    const k = (f: string) => `payments.${i}.${f}`;
    if (!(PAYMENT_METHODS as readonly string[]).includes(p.method)) errors[k('method')] = 'אמצעי תשלום לא תקין';
    if (!Number.isInteger(p.amount) || p.amount <= 0) errors[k('amount')] = 'סכום התקבול חייב להיות גדול מ-0';
    if (!isDateString(p.receivedAt)) errors[k('receivedAt')] = 'תאריך לא תקין';
    else if (p.receivedAt > today) errors[k('receivedAt')] = 'תאריך התשלום לא יכול להיות עתידי';

    if (p.method === 'CHEQUE') {
      if (!p.chequeNumber.trim()) errors[k('chequeNumber')] = 'חסר מספר שיק';
      if (!p.chequeBank.trim()) errors[k('chequeBank')] = 'חסר בנק';
      if (!p.chequeBranch.trim()) errors[k('chequeBranch')] = 'חסר סניף';
      if (!p.chequeDueDate) errors[k('chequeDueDate')] = 'חסר תאריך פירעון';
      else if (!isDateString(p.chequeDueDate)) errors[k('chequeDueDate')] = 'תאריך לא תקין';
    }
  });

  return errors;
}

export function receiptTotal(payments: Pick<PaymentLineDraft, 'amount'>[]): number {
  return payments.reduce((sum, p) => sum + (p.amount > 0 ? p.amount : 0), 0);
}
