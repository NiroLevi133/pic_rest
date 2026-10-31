'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';

/** Confirmation step before an irreversible action. */
export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'אישור', danger, confirmDisabled, children }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : () => { setError(''); onClose(); }}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>ביטול</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={handleConfirm} disabled={busy || confirmDisabled}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      {message && <div className="text-sm text-[var(--text-muted)]">{message}</div>}
      {children}
      {error && <p className="text-sm text-[var(--error)] mt-3" role="alert">{error}</p>}
    </Modal>
  );
}
