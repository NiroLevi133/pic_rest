'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Printer } from 'lucide-react';

/**
 * Toolbar above a printable document (hidden when printing).
 * For receipts, `receiptId` makes every print (button or Ctrl+P) register
 * with the server, so only the first print is the "מקור".
 */
export default function PrintToolbar({ backHref, backLabel = 'חזרה', receiptId, children }: {
  backHref?: string;
  backLabel?: string;
  receiptId?: string;
  children?: React.ReactNode;
}) {
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    if (!receiptId) return;
    const before = () => navigator.sendBeacon(`/api/receipts/${receiptId}/print`);
    const after = () => setPrinted(true);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, [receiptId]);

  // After the original was printed, reload so the label shows "העתק נאמן למקור".
  useEffect(() => {
    if (printed) window.location.reload();
  }, [printed]);

  return (
    <div className="no-print max-w-[210mm] mx-auto mb-4 flex flex-wrap items-center gap-2 justify-between" dir="rtl">
      {backHref ? (
        <a href={backHref} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900">
          <ArrowRight className="w-4 h-4" /> {backLabel}
        </a>
      ) : <span />}
      <div className="flex flex-wrap gap-2">
        {children}
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-700"
        >
          <Printer className="w-4 h-4" /> הדפסה / שמירה כ-PDF
        </button>
      </div>
    </div>
  );
}
