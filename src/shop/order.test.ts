import { describe, expect, it } from 'vitest';
import { isValidIsraeliPhone, orderMessage, parseOrderItems, validateCheckout } from './order';

const details = { name: 'דנה כהן', phone: '050-1234567', city: 'תל אביב', address: 'דיזנגוף 100', notes: '' };
const gid = 'clx1234567890abcdef';

describe('shop order', () => {
  it('accepts Israeli phone formats', () => {
    expect(isValidIsraeliPhone('050-1234567')).toBe(true);
    expect(isValidIsraeliPhone('+972 52 123 4567')).toBe(true);
    expect(isValidIsraeliPhone('03-5551234')).toBe(true);
    expect(isValidIsraeliPhone('12345')).toBe(false);
  });

  it('flags missing checkout fields', () => {
    expect(validateCheckout(details)).toEqual({});
    expect(Object.keys(validateCheckout({ ...details, name: '', address: '' }))).toEqual(['name', 'address']);
  });

  it('rejects malformed order items', () => {
    expect(parseOrderItems([{ generationId: gid, variant: 1, frame: 'black', qty: 2 }])).toHaveLength(1);
    expect(parseOrderItems([])).toBeNull();
    expect(parseOrderItems([{ generationId: gid, variant: 1, frame: 'gold', qty: 2 }])).toBeNull();
    expect(parseOrderItems([{ generationId: gid, variant: 1, frame: 'black', qty: 0 }])).toBeNull();
    expect(parseOrderItems([{ generationId: '../x', variant: 1, frame: 'black', qty: 1 }])).toBeNull();
  });

  it('lists every tile with its image link and the totals', () => {
    const msg = orderMessage('K-TEST1', [
      { generationId: gid, variant: 0, frame: 'black', qty: 2, imageUrl: 'https://x/a.jpg' },
      { generationId: gid, variant: 3, frame: 'white', qty: 1, imageUrl: 'https://x/b.jpg' },
    ], details);
    expect(msg).toContain('K-TEST1');
    expect(msg).toContain('https://x/a.jpg');
    expect(msg).toContain('מסגרת לבן');
    expect(msg).toContain('הנחת כמות (10%)');
    expect(msg).toContain('דיזנגוף 100, תל אביב');
  });
});
