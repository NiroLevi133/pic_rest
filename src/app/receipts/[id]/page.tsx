'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Printer, Ban } from 'lucide-react';
import { PAYMENT_METHODS, BUSINESS_TYPES, formatAmount, formatPhone, type ReceiptDTO } from '@/lib/receipts';

export default function ReceiptView({ params }: { params: { id: string } }) {
  const [receipt, setReceipt] = useState<ReceiptDTO | null>(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetch(`/api/receipts/${params.id}`)
      .then((r) => r.json())
      .then((d) => (d.success ? setReceipt(d.data) : setError(d.error)))
      .catch(() => setError('שגיאת רשת'));
  }, [params.id]);

  async function cancel() {
    const reason = prompt('סיבת ביטול הקבלה (הקבלה תישאר ברישום ותסומן כמבוטלת):');
    if (reason === null) return;
    setCancelling(true);
    const res = await fetch(`/api/receipts/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', reason }),
    }).then((r) => r.json()).catch(() => ({ success: false, error: 'שגיאת רשת' }));
    setCancelling(false);
    if (res.success) setReceipt(res.data);
    else alert(res.error);
  }

  if (error) return <p className="text-center text-red-400 py-20">{error}</p>;
  if (!receipt) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const cancelled = receipt.status === 'CANCELLED';
  const date = new Date(receipt.issueDate).toLocaleDateString('he-IL');

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between gap-2 print:hidden max-w-[210mm] mx-auto">
        <Link href="/receipts" className="btn-ghost"><ArrowRight className="w-4 h-4" />חזרה</Link>
        <div className="flex gap-2">
          {!cancelled && (
            <button onClick={cancel} disabled={cancelling} className="btn-danger">
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}ביטול קבלה
            </button>
          )}
          <button onClick={() => window.print()} className="btn-primary"><Printer className="w-4 h-4" />הדפסה / PDF</button>
        </div>
      </div>

      {/* The paper */}
      <div className="relative bg-white text-neutral-900 max-w-[210mm] mx-auto p-10 sm:p-14 rounded-lg shadow-xl print:shadow-none print:rounded-none print:p-0 print:max-w-none">
        {cancelled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-red-600/25 text-8xl font-black -rotate-12 border-8 border-red-600/25 px-8 rounded-xl">מבוטלת</span>
          </div>
        )}

        <header className="flex justify-between items-start border-b-2 border-neutral-900 pb-5">
          <div>
            <h1 className="text-2xl font-bold">{receipt.issuerName || '—'}</h1>
            <p className="text-sm text-neutral-600 mt-1">
              {BUSINESS_TYPES[receipt.issuerType] ?? receipt.issuerType}
              {receipt.issuerTaxId && <> · מס׳ <span dir="ltr">{receipt.issuerTaxId}</span></>}
            </p>
            {receipt.issuerAddress && <p className="text-sm text-neutral-600">{receipt.issuerAddress}</p>}
            {receipt.issuerPhone && <p className="text-sm text-neutral-600" dir="ltr">{formatPhone(receipt.issuerPhone)}</p>}
          </div>
          <div className="text-left">
            <p className="text-3xl font-black tracking-tight">קבלה</p>
            <p className="text-lg font-mono mt-1">מס׳ {receipt.number}</p>
            <p className="text-sm text-neutral-600 mt-1">{date}</p>
            <p className="text-xs text-neutral-500 mt-1">מקור</p>
          </div>
        </header>

        <section className="mt-6">
          <p className="text-sm text-neutral-500">לכבוד</p>
          <p className="text-lg font-semibold">{receipt.customerName}</p>
          {receipt.customerCompany && <p>{receipt.customerCompany}</p>}
          {receipt.customerTaxId && <p className="text-sm">ח.פ / ת.ז: <span dir="ltr">{receipt.customerTaxId}</span></p>}
          <p className="text-sm" dir="ltr" style={{ textAlign: 'right' }}>{formatPhone(receipt.customerPhone)}</p>
        </section>

        <table className="w-full mt-8 text-sm border-collapse">
          <thead>
            <tr className="bg-neutral-100 text-right">
              <th className="p-3 font-semibold">פירוט</th>
              <th className="p-3 font-semibold">אמצעי תשלום</th>
              <th className="p-3 font-semibold">אסמכתא</th>
              <th className="p-3 font-semibold text-left">סכום</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-200">
              <td className="p-3">{receipt.description || 'תשלום'}</td>
              <td className="p-3">{PAYMENT_METHODS[receipt.paymentMethod] ?? receipt.paymentMethod}</td>
              <td className="p-3" dir="ltr" style={{ textAlign: 'right' }}>{receipt.paymentRef || '—'}</td>
              <td className="p-3 text-left font-medium">{formatAmount(receipt.amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end mt-4">
          <div className="border-t-2 border-neutral-900 pt-3 min-w-[220px] flex justify-between gap-6 text-lg font-bold">
            <span>סה״כ התקבל</span>
            <span>{formatAmount(receipt.amount)}</span>
          </div>
        </div>

        {cancelled && (
          <p className="mt-8 text-sm text-red-700">
            הקבלה בוטלה{receipt.cancelledAt && ` ב-${new Date(receipt.cancelledAt).toLocaleDateString('he-IL')}`}
            {receipt.cancelReason && ` · סיבה: ${receipt.cancelReason}`}
          </p>
        )}

        <footer className="mt-16 pt-4 border-t border-neutral-200 text-xs text-neutral-500 flex justify-between">
          <span>מסמך ממוחשב</span>
          <span>הופק {new Date(receipt.createdAt).toLocaleString('he-IL')}</span>
        </footer>
      </div>
    </div>
  );
}
