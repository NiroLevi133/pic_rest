import { describe, expect, it } from 'vitest';
import { balanceDue, computeQuote, findTier } from './quote-math';
import { formatAmount, parseShekels } from './money';

describe('money', () => {
  it('parses shekel input to agorot', () => {
    expect(parseShekels('4,500')).toBe(450000);
    expect(parseShekels('99.9')).toBe(9990);
    expect(parseShekels('₪ 12.05')).toBe(1205);
    expect(parseShekels('')).toBeNull();
    expect(parseShekels('abc')).toBeNull();
    expect(parseShekels('1.234')).toBeNull();
  });
  it('formats agorot', () => {
    expect(formatAmount(450000)).toBe('4,500');
    expect(formatAmount(1205)).toBe('12.05');
  });
});

describe('computeQuote', () => {
  const exempt = { vatType: 'EXEMPT' as const, vatRate: 18 };

  it('package price with extras', () => {
    const t = computeQuote({
      ...exempt, priceMode: 'TOTAL', packagePrice: 400000,
      items: [{ description: 'שעה נוספת', quantity: 2, unitPrice: 50000 }],
    });
    expect(t.subtotal).toBe(500000);
    expect(t.total).toBe(500000);
    expect(t.vatAmount).toBe(0);
    expect(t.lines).toHaveLength(2);
  });

  it('per-person tiers pick the matching range (inclusive bounds)', () => {
    const tiers = [{ max: 50, price: 12000 }, { min: 51, max: 100, price: 10000 }, { min: 101, price: 9000 }];
    expect(findTier(tiers, 50)?.price).toBe(12000);
    expect(findTier(tiers, 51)?.price).toBe(10000);
    expect(findTier(tiers, 300)?.price).toBe(9000);
    const t = computeQuote({ ...exempt, priceMode: 'PER_PERSON', tiers, guestCount: 80 });
    expect(t.total).toBe(800000);
    expect(t.lines[0].description).toContain('51–100');
  });

  it('warns when no tier matches or guests missing', () => {
    const tiers = [{ min: 10, max: 20, price: 100 }];
    expect(computeQuote({ ...exempt, priceMode: 'PER_PERSON', tiers, guestCount: 5 }).warnings[0]).toContain('אין מדרגת');
    expect(computeQuote({ ...exempt, priceMode: 'PER_PERSON', tiers }).warnings[0]).toContain('כמות אורחים');
  });

  it('discount: amount is capped, percent in basis points', () => {
    expect(computeQuote({ ...exempt, priceMode: 'TOTAL', packagePrice: 10000, discountType: 'AMOUNT', discountValue: 99999 }).total).toBe(0);
    const t = computeQuote({ ...exempt, priceMode: 'TOTAL', packagePrice: 10000, discountType: 'PERCENT', discountValue: 1000 });
    expect(t.discountAmount).toBe(1000);
    expect(t.total).toBe(9000);
  });

  it('VAT added on top for licensed businesses', () => {
    const t = computeQuote({ vatType: 'LICENSED', vatRate: 18, priceMode: 'TOTAL', packagePrice: 100000 });
    expect(t.net).toBe(100000);
    expect(t.vatAmount).toBe(18000);
    expect(t.total).toBe(118000);
  });

  it('VAT extracted when prices include VAT, with rounding', () => {
    const t = computeQuote({ vatType: 'COMPANY', vatRate: 18, priceMode: 'TOTAL', packagePrice: 100001, pricesIncludeVat: true });
    expect(t.total).toBe(100001);
    expect(t.vatAmount).toBe(15254);
    expect(t.net + t.vatAmount).toBe(t.total);
  });

  it('items mode with fractional quantity rounds to agorot', () => {
    const t = computeQuote({ ...exempt, priceMode: 'ITEMS', items: [{ description: 'שעות', quantity: 1.5, unitPrice: 333 }] });
    expect(t.total).toBe(500);
  });

  it('balance never negative', () => {
    expect(balanceDue(400000, 100000)).toBe(300000);
    expect(balanceDue(400000, 500000)).toBe(0);
  });
});
