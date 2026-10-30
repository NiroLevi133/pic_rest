/** Customer field rules — shared by the API (authoritative) and forms. */

export const CUSTOMER_STATUSES = ['LEAD', 'QUOTE_SENT', 'ACTIVE', 'INACTIVE'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export interface CustomerInput {
  name: string;
  phone: string;
  email: string;
  taxId: string;
  address: string;
  notes: string;
  status: CustomerStatus;
}

export const CUSTOMER_FIELD_LABELS: Record<keyof CustomerInput, string> = {
  name: 'שם',
  phone: 'טלפון',
  email: 'אימייל',
  taxId: 'ח.פ / ע.מ / ת.ז',
  address: 'כתובת',
  notes: 'הערות',
  status: 'סטטוס',
};

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Normalize and validate raw input. `partial` validates only the fields present
 * (for PATCH). Returns cleaned values or Hebrew error messages keyed by field.
 */
export function validateCustomer(
  raw: Record<string, unknown>,
  partial = false,
): { ok: true; value: Partial<CustomerInput> } | { ok: false; errors: Partial<Record<keyof CustomerInput, string>> } {
  const value: Partial<CustomerInput> = {};
  const errors: Partial<Record<keyof CustomerInput, string>> = {};
  const has = (k: string) => !partial || k in raw;

  if (has('name')) {
    value.name = str(raw.name);
    if (!value.name) errors.name = 'שם הוא שדה חובה';
    else if (value.name.length > 120) errors.name = 'שם ארוך מדי';
  }
  if (has('phone')) {
    // Keep digits and a leading + only; display formatting happens in the UI.
    const p = str(raw.phone);
    value.phone = p.startsWith('+') ? '+' + p.replace(/\D/g, '') : p.replace(/\D/g, '');
    const digits = value.phone.replace(/\D/g, '');
    if (value.phone && (digits.length < 9 || digits.length > 15)) errors.phone = 'מספר טלפון לא תקין';
  }
  if (has('email')) {
    value.email = str(raw.email).toLowerCase();
    if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = 'כתובת אימייל לא תקינה';
  }
  if (has('taxId')) {
    value.taxId = str(raw.taxId).replace(/[\s-]/g, '');
    if (value.taxId && !/^\d{5,9}$/.test(value.taxId)) errors.taxId = 'מספר מזהה צריך להכיל 5–9 ספרות';
  }
  if (has('address')) value.address = str(raw.address);
  if (has('notes')) value.notes = str(raw.notes);
  if (has('status')) {
    const s = str(raw.status) || 'LEAD';
    if ((CUSTOMER_STATUSES as readonly string[]).includes(s)) value.status = s as CustomerStatus;
    else errors.status = 'סטטוס לא תקין';
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };
}

/** "0501234567" → "050-1234567" (Israeli mobile/landline), otherwise unchanged. */
export function formatPhone(phone: string): string {
  if (/^05\d{8}$/.test(phone)) return `${phone.slice(0, 3)}-${phone.slice(3)}`;
  if (/^0[2-9]\d{7}$/.test(phone)) return `${phone.slice(0, 2)}-${phone.slice(2)}`;
  return phone;
}

/** Field-level diff for the audit log — only changed keys. */
export function diffFields<T extends object>(before: T, after: Partial<T>): Partial<Record<keyof T, { from: unknown; to: unknown }>> {
  const out: Partial<Record<keyof T, { from: unknown; to: unknown }>> = {};
  for (const key of Object.keys(after) as (keyof T)[]) {
    if (after[key] !== undefined && after[key] !== before[key]) out[key] = { from: before[key], to: after[key] };
  }
  return out;
}
