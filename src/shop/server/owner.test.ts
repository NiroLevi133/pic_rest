import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({ db: {} }));
const { normalizePhone, unlimitedPhones } = await import('./owner');

describe('owner unlimited generation', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('normalizes Israeli phone formats', () => {
    expect(normalizePhone('050-123-4567')).toBe('0501234567');
    expect(normalizePhone('+972 50 123 4567')).toBe('0501234567');
    expect(normalizePhone('972501234567')).toBe('0501234567');
  });

  it('takes OWNER_PHONE plus SHOP_UNLIMITED_PHONES', () => {
    vi.stubEnv('OWNER_PHONE', '050-1234567');
    vi.stubEnv('SHOP_UNLIMITED_PHONES', '+972 52 765 4321, 054-0000000');
    expect([...unlimitedPhones()].sort()).toEqual(['0501234567', '0540000000', '0527654321'].sort());
  });

  it('is empty when nothing is configured', () => {
    vi.stubEnv('OWNER_PHONE', '');
    vi.stubEnv('SHOP_UNLIMITED_PHONES', '');
    expect(unlimitedPhones().size).toBe(0);
  });
});
