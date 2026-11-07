import { describe, expect, it } from 'vitest';
import { bundleDiscountPercent, FREE_SHIPPING_FROM, orderTotals, SHIPPING_PRICE, TILE_PRICE } from './pricing';

describe('shop pricing', () => {
  it('gives bundle discounts by total quantity', () => {
    expect(bundleDiscountPercent(2)).toBe(0);
    expect(bundleDiscountPercent(3)).toBe(10);
    expect(bundleDiscountPercent(6)).toBe(20);
  });

  it('charges shipping below the free-shipping threshold', () => {
    const t = orderTotals([1]);
    expect(t.subtotal).toBe(TILE_PRICE);
    expect(t.shipping).toBe(SHIPPING_PRICE);
    expect(t.total).toBe(TILE_PRICE + SHIPPING_PRICE);
    expect(t.toFreeShipping).toBe(FREE_SHIPPING_FROM - TILE_PRICE);
  });

  it('applies the discount before checking free shipping', () => {
    const t = orderTotals([2, 2]);
    expect(t.qty).toBe(4);
    expect(t.discountPercent).toBe(10);
    expect(t.discount).toBe(Math.round(4 * TILE_PRICE * 0.1));
    expect(t.total).toBe(4 * TILE_PRICE - t.discount + t.shipping);
  });

  it('an empty order costs nothing', () => {
    expect(orderTotals([])).toMatchObject({ qty: 0, total: 0, shipping: 0, toFreeShipping: 0 });
  });
});
