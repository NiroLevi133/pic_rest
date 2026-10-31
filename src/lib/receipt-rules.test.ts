import { describe, expect, it } from 'vitest';
import {
  emptyPaymentLine, isValidIsraeliId, receiptTotal, validateBusinessForReceipts, validateReceiptDraft,
  type ReceiptDraft,
} from './receipt-rules';

const TODAY = '2026-10-31';

function draft(over: Partial<ReceiptDraft> = {}): ReceiptDraft {
  return {
    customerId: 'c1',
    payer: { name: 'דנה כהן', taxId: '', address: 'הרצל 1, תל אביב', addressExempt: false, phone: '', email: '' },
    description: 'מקדמה עבור בר קוקטיילים לחתונה',
    payments: [{ ...emptyPaymentLine('TRANSFER', TODAY), amount: 100000 }],
    notes: '',
    ...over,
  };
}

describe('isValidIsraeliId', () => {
  it('accepts valid check digits, with or without leading zeros', () => {
    expect(isValidIsraeliId('000000018')).toBe(true);
    expect(isValidIsraeliId('18')).toBe(false); // too short
    expect(isValidIsraeliId('123456782')).toBe(true);
    expect(isValidIsraeliId('123456789')).toBe(false);
    expect(isValidIsraeliId('515555551')).toBe(false);
  });
});

describe('validateBusinessForReceipts', () => {
  it('requires name, valid tax id and address', () => {
    const e = validateBusinessForReceipts({ businessName: '', taxId: '123456789', vatType: 'EXEMPT', address: '' });
    expect(Object.keys(e).sort()).toEqual(['address', 'businessName', 'taxId']);
    expect(validateBusinessForReceipts({ businessName: 'NIRO BAR', taxId: '123456782', vatType: 'EXEMPT', address: 'רחובות' })).toEqual({});
  });
});

describe('validateReceiptDraft', () => {
  it('a complete draft passes', () => {
    expect(validateReceiptDraft(draft(), TODAY)).toEqual({});
  });

  it('requires payer name, description and at least one payment', () => {
    const e = validateReceiptDraft(draft({ payer: { ...draft().payer, name: ' ' }, description: '', payments: [] }), TODAY);
    expect(e['payer.name']).toBeTruthy();
    expect(e.description).toBeTruthy();
    expect(e.payments).toBeTruthy();
  });

  it('requires address unless explicitly exempt', () => {
    const noAddr = { ...draft().payer, address: '' };
    expect(validateReceiptDraft(draft({ payer: noAddr }), TODAY)['payer.address']).toBeTruthy();
    expect(validateReceiptDraft(draft({ payer: { ...noAddr, addressExempt: true } }), TODAY)['payer.address']).toBeUndefined();
  });

  it('rejects zero/negative amounts and future payment dates', () => {
    const e = validateReceiptDraft(draft({
      payments: [
        { ...emptyPaymentLine('CASH', TODAY), amount: 0 },
        { ...emptyPaymentLine('CASH', '2026-11-05'), amount: 100 },
      ],
    }), TODAY);
    expect(e['payments.0.amount']).toBeTruthy();
    expect(e['payments.1.receivedAt']).toBeTruthy();
  });

  it('cheques require number, bank, branch and due date', () => {
    const e = validateReceiptDraft(draft({ payments: [{ ...emptyPaymentLine('CHEQUE', TODAY), amount: 5000 }] }), TODAY);
    expect(Object.keys(e).sort()).toEqual([
      'payments.0.chequeBank', 'payments.0.chequeBranch', 'payments.0.chequeDueDate', 'payments.0.chequeNumber',
    ]);
    const ok = validateReceiptDraft(draft({
      payments: [{
        ...emptyPaymentLine('CHEQUE', TODAY), amount: 5000,
        chequeNumber: '1234', chequeBank: '12', chequeBranch: '600', chequeDueDate: '2026-12-01',
      }],
    }), TODAY);
    expect(ok).toEqual({});
  });

  it('sums the payment lines', () => {
    expect(receiptTotal([{ amount: 100 }, { amount: 250 }])).toBe(350);
  });
});
