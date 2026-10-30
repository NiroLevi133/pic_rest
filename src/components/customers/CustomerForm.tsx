'use client';

import { clsx } from 'clsx';
import { CUSTOMER_STATUSES } from '@/lib/customers';
import { statusLabel } from '@/components/ui/StatusBadge';
import type { CustomerDraft } from './types';

export type FieldErrors = Partial<Record<keyof CustomerDraft, string>>;

function Field({ id, label, error, required, children, className }: {
  id: string; label: string; error?: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}{required && <span className="text-[var(--error)]"> *</span>}</label>
      {children}
      {error && <p className="text-xs text-[var(--error)] mt-1">{error}</p>}
    </div>
  );
}

export default function CustomerForm({ value, onChange, errors = {}, idPrefix = 'cust', showStatus = true }: {
  value: CustomerDraft;
  onChange: (v: CustomerDraft) => void;
  errors?: FieldErrors;
  idPrefix?: string;
  showStatus?: boolean;
}) {
  const set = (k: keyof CustomerDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });
  const cls = (k: keyof CustomerDraft) => clsx('input', errors[k] && '!border-[var(--error)]');

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field id={`${idPrefix}-name`} label="שם מלא / שם עסק" required error={errors.name} className="sm:col-span-2">
        <input id={`${idPrefix}-name`} className={cls('name')} value={value.name} onChange={set('name')} autoFocus />
      </Field>
      <Field id={`${idPrefix}-phone`} label="טלפון" error={errors.phone}>
        <input id={`${idPrefix}-phone`} type="tel" dir="ltr" className={clsx(cls('phone'), 'text-right')} value={value.phone} onChange={set('phone')} placeholder="050-0000000" />
      </Field>
      <Field id={`${idPrefix}-email`} label="אימייל" error={errors.email}>
        <input id={`${idPrefix}-email`} type="email" dir="ltr" className={clsx(cls('email'), 'text-right')} value={value.email} onChange={set('email')} />
      </Field>
      <Field id={`${idPrefix}-taxId`} label="ח.פ / ע.מ / ת.ז" error={errors.taxId}>
        <input id={`${idPrefix}-taxId`} inputMode="numeric" dir="ltr" className={clsx(cls('taxId'), 'text-right')} value={value.taxId} onChange={set('taxId')} />
      </Field>
      {showStatus && (
        <Field id={`${idPrefix}-status`} label="סטטוס" error={errors.status}>
          <select id={`${idPrefix}-status`} className={cls('status')} value={value.status} onChange={set('status')}>
            {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        </Field>
      )}
      <Field id={`${idPrefix}-address`} label="כתובת" error={errors.address} className="sm:col-span-2">
        <input id={`${idPrefix}-address`} className={cls('address')} value={value.address} onChange={set('address')} />
      </Field>
      <Field id={`${idPrefix}-notes`} label="הערות" error={errors.notes} className="sm:col-span-2">
        <textarea id={`${idPrefix}-notes`} rows={3} className={clsx(cls('notes'), 'resize-none')} value={value.notes} onChange={set('notes')} />
      </Field>
    </div>
  );
}
