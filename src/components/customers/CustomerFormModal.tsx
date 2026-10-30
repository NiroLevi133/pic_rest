'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { ErrorBox } from '@/components/ui/Spinner';
import CustomerForm, { type FieldErrors } from './CustomerForm';
import { EMPTY_CUSTOMER, type Customer, type CustomerDraft } from './types';

/** Create a customer without leaving the current screen. */
export default function CustomerFormModal({ open, onClose, onCreated, initial }: {
  open: boolean;
  onClose: () => void;
  onCreated: (c: Customer) => void;
  initial?: Partial<CustomerDraft>;
}) {
  const [draft, setDraft] = useState<CustomerDraft>(EMPTY_CUSTOMER);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const initialRef = useRef(initial);
  initialRef.current = initial;

  // Reset only when the modal opens — `initial` is often a fresh object each render.
  useEffect(() => {
    if (open) { setDraft({ ...EMPTY_CUSTOMER, ...initialRef.current }); setErrors({}); setError(''); }
  }, [open]);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!data.success) {
        setErrors(data.fields ?? {});
        setError(data.error || 'שמירת הלקוח נכשלה');
        return;
      }
      onCreated(data.data);
      onClose();
    } catch {
      setError('שגיאת רשת — נסה שוב');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="לקוח חדש"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>ביטול</button>
          <button className="btn-primary" onClick={() => save()} disabled={saving || !draft.name.trim()}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} שמירת לקוח
          </button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-4">
        {error && <ErrorBox message={error} />}
        <CustomerForm value={draft} onChange={setDraft} errors={errors} idPrefix="new-cust" />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
