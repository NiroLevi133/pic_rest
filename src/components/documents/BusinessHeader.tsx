import { VAT_TYPE_LABELS } from '@/lib/business-labels';

export interface DocBusiness {
  name: string;
  taxId: string;
  vatType: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  footer: string;
}

/** "עוסק פטור" / "עוסק מורשה" / "ח.פ" — printed before the business number on receipts. */
export function taxIdLabel(vatType: string): string {
  return vatType === 'COMPANY' ? 'ח.פ' : VAT_TYPE_LABELS[vatType as keyof typeof VAT_TYPE_LABELS] ?? 'עוסק';
}

/** Business block at the top of every document. */
export default function BusinessHeader({ business, title, subtitle, showTaxId = true }: {
  business: DocBusiness;
  title: string;
  subtitle?: React.ReactNode;
  /** Receipts must show the business type + number; quotes stay cleaner without it. */
  showTaxId?: boolean;
}) {
  return (
    <header className="flex items-start justify-between gap-6 pb-5 border-b-2 border-neutral-900">
      <div className="flex items-start gap-3 min-w-0">
        {business.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logoUrl} alt="" className="w-16 h-16 object-contain shrink-0" />
        )}
        <div className="min-w-0 text-sm leading-relaxed">
          <p className="text-lg font-bold">{business.name}</p>
          {showTaxId && business.taxId && <p>{taxIdLabel(business.vatType)} {business.taxId}</p>}
          {business.address && <p className="doc-muted">{business.address}</p>}
          <p className="doc-muted">
            {[business.phone, business.email].filter(Boolean).map((v, i) => (
              <span key={v}>{i > 0 && <span className="mx-1.5">·</span>}<bdi dir="ltr">{v}</bdi></span>
            ))}
          </p>
        </div>
      </div>
      <div className="text-end shrink-0">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {subtitle && <div className="text-sm mt-1">{subtitle}</div>}
      </div>
    </header>
  );
}
