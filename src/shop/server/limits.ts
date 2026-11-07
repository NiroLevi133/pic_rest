import { createHash } from 'crypto';
import { db } from './db';

/** Uploads one visitor may generate per 24h (each upload = 4 images). */
const PER_CLIENT = Number(process.env.SHOP_DAILY_LIMIT_PER_CLIENT || 3);
/** Uploads the whole store may generate per 24h — a hard cap on AI spend. */
const TOTAL = Number(process.env.SHOP_DAILY_LIMIT_TOTAL || 100);

/** A one-way hash of the visitor's IP (the raw IP is never stored). */
export function clientHash(req: Request): string {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  const salt = process.env.SHOP_HASH_SECRET || process.env.SESSION_SECRET || 'shop';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

export type LimitResult = { ok: true } | { ok: false; reason: 'client' | 'total' };

export async function checkDailyLimit(hash: string): Promise<LimitResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [mine, all] = await Promise.all([
    db.shopGeneration.count({ where: { clientHash: hash, createdAt: { gte: since } } }),
    db.shopGeneration.count({ where: { createdAt: { gte: since } } }),
  ]);
  if (mine >= PER_CLIENT) return { ok: false, reason: 'client' };
  if (all >= TOTAL) return { ok: false, reason: 'total' };
  return { ok: true };
}
