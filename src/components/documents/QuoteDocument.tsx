import { CheckCircle2 } from 'lucide-react';
import { computeQuote, type VatType } from '@/lib/quote-math';
import { formatAmount, formatILS } from '@/lib/money';
import { formatDate, formatDay } from '@/lib/dates';
import { tierLabel, type QuoteDraft } from '@/lib/quotes';
import BusinessHeader, { type DocBusiness } from './BusinessHeader';

export interface QuoteDocData {
  business: DocBusiness;
  number: number;
  version: number;
  createdAt: string | Date;
  customer: { name: string; phone: string; email: string; address: string; taxId: string };
  draft: QuoteDraft;
  totals: { subtotal: number; discountAmount: number; vatRate: number; vatAmount: number; total: number };
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 py-1 ${strong ? 'text-lg font-bold border-t border-neutral-900 mt-1 pt-2' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/** The professional (binding) quote document. Prices here always come from the structured data. */
export default function QuoteDocument({ data }: { data: QuoteDocData }) {
  const { business, draft: d, totals: t, customer } = data;
  const { lines } = computeQuote({ ...d, vatType: business.vatType as VatType, vatRate: t.vatRate });
  const event = [
    ['סוג האירוע', d.serviceType],
    ['תאריך', formatDay(d.eventDate)],
    ['מיקום', d.location],
    ['כמות אורחים', d.guestCount ? String(d.guestCount) : ''],
  ].filter(([, v]) => v);
  const vatApplies = t.vatRate > 0;
  const tiers = d.priceMode === 'PER_PERSON' ? d.tiers.filter((x) => x.price > 0) : [];

  return (
    <article className="doc-paper" dir="rtl">
      <BusinessHeader
        business={business}
        showTaxId={false}
        title="הצעת מחיר"
        subtitle={
          <>
            <p className="font-semibold">מס' {data.number}{data.version > 1 && ` · גרסה ${data.version}`}</p>
            <p className="doc-muted">תאריך: {formatDate(data.createdAt)}</p>
          </>
        }
      />

      <section className="grid sm:grid-cols-2 gap-6 py-5 text-sm">
        <div>
          <p className="doc-muted text-xs mb-1">לכבוד</p>
          <p className="font-semibold text-base">{customer.name}</p>
          {d.clientRole && <p>{d.clientRole}</p>}
          {customer.taxId && <p>ח.פ / ת.ז {customer.taxId}</p>}
          {customer.address && <p className="doc-muted">{customer.address}</p>}
          {customer.phone && <p className="doc-muted" dir="ltr" style={{ textAlign: 'right' }}>{customer.phone}</p>}
        </div>
        {event.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {event.map(([label, value]) => (
              <div key={label}>
                <dt className="doc-muted text-xs">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {d.title && <h2 className="text-lg font-bold mb-3">{d.title}</h2>}

      {d.template === 'NIRO_BAR' && d.niroFeatures.length > 0 && (
        <section className="mb-5">
          <h3 className="font-bold mb-2">מה מחכה לכם?</h3>
          <ul className="space-y-2 text-sm">
            {d.niroFeatures.map((f) => (
              <li key={f.title} className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-neutral-700" />
                <div>
                  <p className="font-medium">{f.title}</p>
                  {f.description && <p className="doc-muted">{f.description}</p>}
                </div>
              </li>
            ))}
            {d.gift && (
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-neutral-700" />
                <p><span className="font-medium">מתנה עלינו: </span>{d.gift}</p>
              </li>
            )}
          </ul>
        </section>
      )}

      {tiers.length > 1 && (
        <section className="mb-5 text-sm">
          <h3 className="font-bold mb-2">מחיר לאדם לפי כמות משתתפים</h3>
          <div className="flex flex-wrap gap-2">
            {tiers.map((tier) => (
              <span key={`${tier.min}-${tier.max}`} className="rounded-lg border border-neutral-300 px-3 py-1.5">
                {tierLabel(tier)} משתתפים: <b>{formatILS(tier.price)}</b>
              </span>
            ))}
          </div>
        </section>
      )}

      <table className="doc-table">
        <thead>
          <tr>
            <th>תיאור</th>
            <th className="!text-center w-20">כמות</th>
            <th className="!text-end w-28">מחיר יחידה</th>
            <th className="!text-end w-28">סה"כ</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td>{l.description}</td>
              <td className="text-center tabular-nums">{l.quantity}</td>
              <td className="text-end tabular-nums">{formatAmount(l.unitPrice)}</td>
              <td className="text-end tabular-nums">{formatAmount(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="flex justify-end mt-4">
        <div className="w-full sm:w-72 text-sm">
          {(t.discountAmount > 0 || vatApplies) && <Row label="סכום ביניים" value={formatILS(t.subtotal)} />}
          {t.discountAmount > 0 && <Row label="הנחה" value={`-${formatILS(t.discountAmount)}`} />}
          {vatApplies && <Row label={`מע"מ ${t.vatRate}%${d.pricesIncludeVat ? ' (כלול)' : ''}`} value={formatILS(t.vatAmount)} />}
          <Row label={vatApplies ? 'סה"כ לתשלום כולל מע"מ' : 'סה"כ לתשלום'} value={formatILS(t.total)} strong />
          {d.depositAmount ? <Row label="מקדמה לשריון" value={formatILS(d.depositAmount)} /> : null}
          {d.extraHourPrice ? <Row label="שעה נוספת" value={formatILS(d.extraHourPrice)} /> : null}
        </div>
      </section>

      {(d.paymentTerms || d.clientNotes) && (
        <section className="mt-6 space-y-4 text-sm">
          {d.paymentTerms && (
            <div>
              <h3 className="font-bold mb-1">תנאי תשלום</h3>
              <p className="whitespace-pre-wrap">{d.paymentTerms}</p>
            </div>
          )}
          {d.clientNotes && (
            <div>
              <h3 className="font-bold mb-1">הערות</h3>
              <p className="whitespace-pre-wrap">{d.clientNotes}</p>
            </div>
          )}
        </section>
      )}

      <footer className="mt-10 pt-4 border-t doc-rule text-xs doc-muted flex flex-wrap justify-between gap-2">
        <span>{business.footer || `${business.name} — תודה שבחרתם בנו`}</span>
        <span>הצעה מס' {data.number}{data.version > 1 ? `/${data.version}` : ''}</span>
      </footer>
    </article>
  );
}
