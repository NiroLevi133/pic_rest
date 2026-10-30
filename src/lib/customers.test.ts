import { describe, it, expect } from 'vitest';
import { validateCustomer, formatPhone, diffFields } from './customers';

describe('validateCustomer', () => {
  it('requires a name on create', () => {
    const r = validateCustomer({ name: '  ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.name).toBeDefined();
  });

  it('normalizes phone, email and tax id', () => {
    const r = validateCustomer({ name: 'דנה כהן', phone: '050-123 4567', email: ' Dana@Example.COM ', taxId: '123-456-782' });
    expect(r).toEqual({
      ok: true,
      value: { name: 'דנה כהן', phone: '0501234567', email: 'dana@example.com', taxId: '123456782', address: '', notes: '', status: 'LEAD' },
    });
  });

  it('rejects malformed values', () => {
    const r = validateCustomer({ name: 'x', phone: '123', email: 'nope', taxId: '12ab', status: 'VIP' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['email', 'phone', 'status', 'taxId']);
  });

  it('allows empty optional fields', () => {
    expect(validateCustomer({ name: 'x', phone: '', email: '', taxId: '' }).ok).toBe(true);
  });

  it('partial mode only touches provided fields', () => {
    expect(validateCustomer({ notes: ' hi ' }, true)).toEqual({ ok: true, value: { notes: 'hi' } });
    expect(validateCustomer({ name: '' }, true).ok).toBe(false);
  });
});

describe('formatPhone', () => {
  it('formats Israeli numbers', () => {
    expect(formatPhone('0501234567')).toBe('050-1234567');
    expect(formatPhone('031234567')).toBe('03-1234567');
    expect(formatPhone('+972501234567')).toBe('+972501234567');
  });
});

describe('diffFields', () => {
  it('returns only changed keys', () => {
    expect(diffFields({ a: 1, b: 'x' }, { a: 1, b: 'y' })).toEqual({ b: { from: 'x', to: 'y' } });
  });
});
