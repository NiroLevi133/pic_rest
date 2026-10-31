'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Download, Loader2, Printer } from 'lucide-react';
import { downloadElementAsPdf } from '@/lib/pdf';

/**
 * Toolbar above a printable document (hidden when printing).
 * For receipts, `receiptId` makes every print (button or Ctrl+P) register
 * with the server, so only the first print is the "מקור".
 */
export default function PrintToolbar({ backHref, backLabel = 'חזרה', receiptId, pdfFileName, children }: {
  backHref?: string;
  backLabel?: string;
  receiptId?: string;
  /** Show a "download PDF" button that saves the page's document */
  pdfFileName?: string;
  children?: React.ReactNode;
}) {
  const [printed, setPrinted] = useState(false);
  const [saving, setSaving] = useState(false);

  async function savePdf() {
    const el = document.querySelector('article.doc-paper') as HTMLElement | null;
    if (!el || !pdfFileName) return;
    setSaving(true);
    try { await downloadElementAsPdf(el, pdfFileName); } finally { setSaving(false); }
  }

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
        {pdfFileName && (
          <button
            type="button"
            onClick={savePdf}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} הורדת PDF
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className={pdfFileName
            ? 'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-white border border-neutral-300 text-neutral-900 hover:bg-neutral-50'
            : 'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-700'}
        >
          <Printer className="w-4 h-4" /> {pdfFileName ? 'הדפסה' : 'הדפסה / שמירה כ-PDF'}
        </button>
      </div>
    </div>
  );
}
