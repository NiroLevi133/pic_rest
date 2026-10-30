import { describe, it, expect, beforeAll } from 'vitest';
import { createSessionToken, verifySessionToken } from './session';

beforeAll(() => { process.env.SESSION_SECRET = 'test-secret'; });

describe('session tokens', () => {
  it('round-trips a valid token', async () => {
    const token = await createSessionToken('user123');
    expect(await verifySessionToken(token)).toBe('user123');
  });

  it('rejects a raw userId (legacy cookie)', async () => {
    expect(await verifySessionToken('user123')).toBeNull();
  });

  it('rejects a token for a different user with a reused signature', async () => {
    const [, exp, sig] = (await createSessionToken('user123')).split('.');
    expect(await verifySessionToken(`attacker.${exp}.${sig}`)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const [userId, , sig] = (await createSessionToken('user123')).split('.');
    expect(await verifySessionToken(`${userId}.1.${sig}`)).toBeNull();
  });

  it('rejects tokens signed with another secret', async () => {
    const token = await createSessionToken('user123');
    process.env.SESSION_SECRET = 'other-secret';
    expect(await verifySessionToken(token)).toBeNull();
    process.env.SESSION_SECRET = 'test-secret';
  });
});
