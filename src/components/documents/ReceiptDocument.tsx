import { formatAmount, formatILS } from '@/lib/money';
import { formatDateTime, formatDay } from '@/lib/dates';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/lib/receipt-rules';
import type { ReceiptSnapshot } from '@/lib/receipt-snapshot';
import BusinessHeader from './BusinessHeader';

/**
 * A receipt rendered strictly from its frozen snapshot.
 * `copyLabel` is "מקור" / "העתק נאמן למקור" (or a preview note).
 */
export default function ReceiptDocument({ snapshot: s, copyLabel, cancelled, integrityOk = true }: {
  snapshot: ReceiptSnapshot;
  copyLabel: string;
  /** The receipt was cancelled by a later document */
  cancelled?: { number: number } | null;
  integrityOk?: boolean;
}) {
  const isCancellation = s.type === 'CANCELLATION';
  return (
    <article className="doc-paper relative" dir="rtl">
      {cancelled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden>
          <span className="text-7xl font-black text-red-600/15 -rotate-[20deg] border-8 border-red-600/15 rounded-3xl px-8 py-2">בוטלה</span>
        </div>
      )}

      <BusinessHeader
        business={s.business}
        title={isCancellation ? 'ביטול קבלה' : 'קבלה'}
        subtitle={
          <>
            <p className="text-lg font-bold">מס' {s.number}</p>
            <p className="doc-muted">תאריך: {s.documentDate ? formatDay(s.documentDate) : formatDateTime(s.issuedAt)}</p>
            <p className="mt-1 inline-block rounded border border-neutral-900 px-2 py-0.5 text-xs font-bold">{copyLabel}</p>
          </>
        }
      />

      {cancelled && (
        <p className="mt-4 rounded-lg bg-red-50 text-red-800 text-sm px-3 py-2">
          קבלה זו בוטלה במסמך ביטול מס' {cancelled.number}.
        </p>
      )}

      <section className="py-5 text-sm space-y-1">
        <p className="doc-muted text-xs">התקבל מאת</p>
        <p className="font-semibold text-base">{s.payer.name}</p>
        {s.payer.taxId && <p>ת.ז / ח.פ {s.payer.taxId}</p>}
        {s.payer.address && <p>{s.payer.address}</p>}
      </section>

      {isCancellation && s.cancels ? (
        <section className="text-sm space-y-2 mb-4">
          <p>
            מסמך זה מבטל את קבלה מס' <b>{s.cancels.number}</b> מתאריך {s.cancels.documentDate ? formatDay(s.cancels.documentDate) : formatDateTime(s.cancels.issuedAt)}
            {' '}על סך <b>{formatILS(s.cancels.total)}</b>.
          </p>
          <p><span className="doc-muted">סיבת הביטול: </span>{s.cancelReason}</p>
        </section>
      ) : (
        <>
          <section className="mb-4 text-sm">
            <p className="doc-muted text-xs">עבור (מהות התקבול)</p>
            <p className="font-medium whitespace-pre-wrap">{s.description}</p>
            {s.quote && <p className="doc-muted text-xs mt-1">בהתאם להצעת מחיר מס' {s.quote.number}{s.quote.version > 1 ? `/${s.quote.version}` : ''}</p>}
          </section>

          <table className="doc-table">
            <thead>
              <tr>
                <th>אמצעי תשלום</th>
                <th>פרטים</th>
                <th className="w-24">תאריך</th>
                <th className="!text-end w-28">סכום</th>
              </tr>
            </thead>
            <tbody>
              {s.payments.map((p, i) => (
                <tr key={i}>
                  <td>{PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method}</td>
                  <td className="text-xs">{p.reference}</td>
                  <td className="tabular-nums">{formatDay(p.receivedAt)}</td>
                  <td className="text-end tabular-nums">{formatAmount(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="flex justify-end mt-4">
        <div className="w-full sm:w-72 flex justify-between text-lg font-bold border-t border-neutral-900 pt-2">
          <span>{isCancellation ? 'סכום מבוטל' : 'סה"כ התקבל'}</span>
          <span className="tabular-nums">{formatILS(s.total)}</span>
        </div>
      </div>

      {s.notes && <p className="mt-5 text-sm whitespace-pre-wrap"><span className="doc-muted">הערות: </span>{s.notes}</p>}

      {/* Paper copies get a signature line; the digital document is computerized and needs none. */}
      <div className="hidden print:flex justify-end mt-12 text-sm">
        <span className="border-t border-neutral-900 pt-1 w-56 text-center">חתימת המקבל</span>
      </div>

      <footer className="mt-10 pt-4 border-t doc-rule text-xs doc-muted space-y-1">
        <p>מסמך ממוחשב — הופק באמצעות {s.software} ואינו דורש חתימה.</p>
        {s.business.footer && <p>{s.business.footer}</p>}
        {!integrityOk && <p className="text-red-700 font-bold">אזהרה: תוכן המסמך אינו תואם לחתימה הדיגיטלית שנשמרה בעת ההפקה.</p>}
      </footer>
    </article>
  );
}
