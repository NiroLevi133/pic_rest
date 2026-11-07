import { describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({ db: {} }));
const { errorCode } = await import('./handlers');

describe('shop error codes', () => {
  it('names the usual production failures', () => {
    expect(errorCode(new Error('generation failed to start: Error: OpenAI 401: Incorrect API key'))).toBe('openai-key');
    expect(errorCode(new Error('OpenAI 403: organization must be verified'))).toBe('openai-access');
    expect(errorCode(new Error('OpenAI 429: quota exceeded'))).toBe('openai-quota');
    expect(errorCode(new Error('The table `public.ShopGeneration` does not exist in the current database.'))).toBe('db-missing-table');
    expect(errorCode(new Error("Can't reach database server at host:5432"))).toBe('db-connection');
    expect(errorCode(new Error('something else'))).toBe('server');
  });
});
