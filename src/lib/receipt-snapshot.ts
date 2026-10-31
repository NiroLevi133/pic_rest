/** The frozen content of an issued receipt — the document is rendered only from this. */
import type { PaymentMethod } from './receipt-rules';

export interface ReceiptSnapshotPayment {
  method: PaymentMethod;
  amount: number;
  receivedAt: string;
  reference: string;
}

export interface ReceiptSnapshot {
  schema: 1;
  type: 'RECEIPT' | 'CANCELLATION';
  number: number;
  /** ISO timestamp — when the document was actually produced */
  issuedAt: string;
  /** yyyy-mm-dd printed as the receipt date: the date the payment was received (absent on early receipts) */
  documentDate?: string;
  business: {
    name: string;
    taxId: string;
    vatType: string;
    address: string;
    phone: string;
    email: string;
    logoUrl: string | null;
    footer: string;
  };
  payer: {
    name: string;
    taxId: string;
    address: string;
    addressExempt: boolean;
    phone: string;
    email: string;
  };
  description: string;
  payments: ReceiptSnapshotPayment[];
  total: number;
  notes: string;
  quote: { number: number; version: number } | null;
  /** For a cancellation document: the receipt it cancels */
  cancels: { number: number; issuedAt: string; documentDate?: string; total: number } | null;
  cancelReason: string;
  /** Every receipt is a computerized document (no handwritten signature required) */
  computerized: true;
  software: string;
}

export const COPY_LABEL = 'העתק נאמן למקור';
export const ORIGINAL_LABEL = 'מקור';
