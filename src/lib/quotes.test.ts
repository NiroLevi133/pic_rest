import { describe, expect, it } from 'vitest';
import { emptyQuoteDraft, formatEventDate, normalizeQuoteDraft, quoteToNiroFields, validateQuoteForSend } from './quotes';
import { buildNiroBarQuotePrompt } from './style-presets';

const niro = () => ({
  ...emptyQuoteDraft('c1', 'NIRO_BAR'),
  serviceType: 'חתונה',
  eventDate: '2026-09-12',
  location: 'גני יהודה, רחובות',
  guestCount: 160,
  niroFeatures: [{ title: '2 ברמנים', description: 'הם ידאגו לכל המזיגה' }],
  gift: '30 תמונות מודפסות על הקוקטיילים',
});

describe('NIRO BAR flyer fields', () => {
  it('formats dates like the original form (d.m.yyyy)', () => {
    expect(formatEventDate('2026-09-12')).toBe('12.9.2026');
    expect(formatEventDate('')).toBe('');
  });

  it('total price mode passes the final total', () => {
    const f = quoteToNiroFields({ ...niro(), priceMode: 'TOTAL', extraHourPrice: 50000 }, 'דנה כהן', 450000);
    expect(f).toMatchObject({
      clientName: 'דנה כהן', eventType: 'חתונה', eventDate: '12.9.2026', eventLocation: 'גני יהודה, רחובות',
      guestCount: '160', priceMode: 'total', totalPrice: '4,500', extraHourPrice: '500',
    });
    const prompt = buildNiroBarQuotePrompt(f);
    expect(prompt).toContain('"בר קוקטיילים לחתונה"');
    expect(prompt).toContain('"4,500 ₪"');
    expect(prompt).toContain('כל שעה נוספת מעבר לחבילה: 500 ₪');
    expect(prompt).toContain('"מתנה עלינו"');
  });

  it('per-person tiers become the original string tiers', () => {
    const f = quoteToNiroFields({
      ...niro(), priceMode: 'PER_PERSON',
      tiers: [{ max: 100, price: 6000 }, { min: 101, max: 200, price: 5000 }, { min: 201, price: 0 }],
    }, 'דנה', 800000);
    expect(f.priceMode).toBe('perPerson');
    expect(f.tiers).toEqual([{ min: '', max: '100', price: '60' }, { min: '101', max: '200', price: '50' }]);
    expect(buildNiroBarQuotePrompt(f)).toContain('שורה: 101–200 משתתפים — 50 ₪ לאדם');
  });

  it('no gift → no gift card', () => {
    const prompt = buildNiroBarQuotePrompt(quoteToNiroFields({ ...niro(), gift: '' }, 'דנה', 100));
    expect(prompt).toContain('אין להציג כרטיס מתנה כלל');
  });
});

describe('validateQuoteForSend', () => {
  it('NIRO BAR requires event details and at least one feature', () => {
    expect(validateQuoteForSend({ ...niro(), niroFeatures: [] }, 100)).toEqual(['יש לבחור לפחות סעיף אחד ב"מה מחכה לכם?"']);
    expect(validateQuoteForSend(niro(), 0)).toEqual(['סכום ההצעה חייב להיות גדול מ-0']);
  });
  it('general quotes only need a customer and a positive total', () => {
    expect(validateQuoteForSend(emptyQuoteDraft('c1'), 100)).toEqual([]);
  });
});

describe('normalizeQuoteDraft', () => {
  it('coerces and clamps untrusted input', () => {
    const d = normalizeQuoteDraft({
      customerId: 'c1', template: 'HACK', priceMode: 'X', guestCount: '-5', eventDate: '12/09/2026',
      discountType: 'PERCENT', discountValue: 999999, items: [{ description: ' a ', quantity: 'x', unitPrice: '150' }],
      niroFeatures: [{ title: '' }, { title: 'ok', description: 3 }],
    });
    expect(d.template).toBe('GENERAL');
    expect(d.priceMode).toBe('TOTAL');
    expect(d.guestCount).toBe(1);
    expect(d.eventDate).toBe('');
    expect(d.discountValue).toBe(10000);
    expect(d.items).toEqual([{ description: 'a', quantity: 1, unitPrice: 150 }]);
    expect(d.niroFeatures).toEqual([{ title: 'ok', description: '' }]);
  });
});
