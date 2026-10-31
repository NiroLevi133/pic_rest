import type { QuoteDraft, QuoteStatus } from '@/lib/quotes';
import type { DocBusiness } from '@/components/documents/BusinessHeader';

export interface QuoteDetail {
  id: string;
  number: number;
  version: number;
  status: QuoteStatus;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  approvedAt: string | null;
  customer: { id: string; name: string; phone: string; email: string; address: string; taxId: string };
  draft: QuoteDraft;
  totals: { subtotal: number; discountAmount: number; vatRate: number; vatAmount: number; total: number };
  paid: number;
  balance: number;
  receipts: { id: string; number: number; type: string; status: string; total: number; issuedAt: string }[];
  versions: { id: string; version: number; status: string; total: number; createdAt: string }[];
  designAssetId: string | null;
  sendIssues: string[];
  vat: { type: string; rate: number };
}

export interface QuoteListItem {
  id: string;
  number: number;
  version: number;
  status: QuoteStatus;
  template: string;
  title: string;
  serviceType: string;
  eventDate: string | null;
  total: number;
  paid: number;
  createdAt: string;
  validUntil: string | null;
  customer: { id: string; name: string };
}

export interface BusinessState {
  profile: {
    businessName: string; taxId: string; vatType: string; vatRate: number; address: string; phone: string; email: string;
    logoUrl: string | null; documentFooter: string; defaultPaymentTerms: string;
    savedServices: { description: string; unitPrice: number }[];
    setupCompletedAt: string | null;
  };
  counters: { quote: { next: number; locked: boolean }; receipt: { next: number; locked: boolean } };
  receiptIssues: Record<string, string>;
}

export function docBusinessFrom(p: BusinessState['profile']): DocBusiness {
  return {
    name: p.businessName, taxId: p.taxId, vatType: p.vatType, address: p.address,
    phone: p.phone, email: p.email, logoUrl: p.logoUrl, footer: p.documentFooter,
  };
}
