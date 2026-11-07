import { beforeEach, describe, expect, it, vi } from 'vitest';

const rows = new Map<string, Record<string, unknown>>();

vi.mock('./db', () => ({
  db: {
    shopGeneration: {
      create: vi.fn(async ({ data }) => {
        const row = { id: 'gen1234567890', createdAt: new Date(), ...data };
        rows.set(row.id, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }) => rows.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }) => {
        const row = { ...rows.get(where.id), ...data };
        rows.set(where.id, row);
        return row;
      }),
    },
  },
}));

const startImage = vi.fn();
const checkImage = vi.fn();
vi.mock('./openai', () => ({ startImage: (...a: unknown[]) => startImage(...a), checkImage: (...a: unknown[]) => checkImage(...a) }));
vi.mock('./storage', () => ({ storeResult: vi.fn(async (b64: string) => `https://cdn/${b64}.jpg`) }));

const { createGeneration, refreshGeneration, variantImage } = await import('./generations');
const photo = { dataUrl: 'data:image/jpeg;base64,AAA', url: 'https://cdn/src.jpg' };

describe('shop generations', () => {
  beforeEach(() => {
    rows.clear();
    startImage.mockReset();
    checkImage.mockReset();
  });

  it('starts 4 variations, each with its own prompt', async () => {
    startImage.mockImplementation(async (_p: string) => `resp_${startImage.mock.calls.length}`);
    const g = await createGeneration('royal', photo, 'hash');
    expect(startImage).toHaveBeenCalledTimes(4);
    expect(new Set(startImage.mock.calls.map((c) => c[0])).size).toBe(4);
    expect(g.status).toBe('pending');
    expect(g.variants.every((v) => v.status === 'pending')).toBe(true);
    // Response ids stay on the server
    expect(JSON.stringify(g)).not.toContain('resp_');
  });

  it('keeps going when some variations fail to start, and fails when none start', async () => {
    startImage.mockRejectedValueOnce(new Error('boom')).mockResolvedValue('resp_ok');
    const g = await createGeneration('royal', photo, 'hash');
    expect(g.variants.map((v) => v.status)).toEqual(['error', 'pending', 'pending', 'pending']);

    startImage.mockReset();
    startImage.mockRejectedValue(new Error('down'));
    await expect(createGeneration('royal', photo, 'hash')).rejects.toThrow();
  });

  it('stores finished images and settles the status when nothing is pending', async () => {
    startImage.mockResolvedValue('resp');
    await createGeneration('royal', photo, 'hash');

    checkImage.mockResolvedValueOnce({ state: 'done', base64: 'img0' }).mockResolvedValue({ state: 'pending' });
    let g = await refreshGeneration('gen1234567890');
    expect(g?.status).toBe('pending');
    expect(g?.variants[0]).toEqual({ status: 'done', url: 'https://cdn/img0.jpg' });

    checkImage.mockReset();
    checkImage
      .mockResolvedValueOnce({ state: 'done', base64: 'img1' })
      .mockResolvedValueOnce({ state: 'error', message: 'policy' })
      .mockResolvedValueOnce({ state: 'done', base64: 'img3' });
    g = await refreshGeneration('gen1234567890');
    expect(g?.status).toBe('done');
    expect(g?.variants.map((v) => v.status)).toEqual(['done', 'done', 'error', 'done']);

    expect(await variantImage('gen1234567890', 3)).toBe('https://cdn/img3.jpg');
    expect(await variantImage('gen1234567890', 2)).toBeNull();
  });
});
