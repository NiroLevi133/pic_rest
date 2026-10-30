'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';

/** Confirmation step before an irreversible action. */
export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'אישור', danger }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>ביטול</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={handleConfirm} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      {message && <div className="text-sm text-[var(--text-muted)]">{message}</div>}
    </Modal>
  );
}
