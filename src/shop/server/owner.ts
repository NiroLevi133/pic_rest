/**
 * Unlimited generation for the business owner.
 *
 * The store has no accounts of its own, so the owner is recognized by their NIRO Workspace login
 * (same site, same session cookie): a logged-in user whose phone is OWNER_PHONE, or one of
 * SHOP_UNLIMITED_PHONES (comma-separated), skips the daily limits.
 *
 * This file is the store's only link to workspace auth. When the store is split out, replace it
 * (e.g. with a secret link) or make it return false.
 */
import { SESSION_COOKIE } from '@/lib/constants';
import { verifySessionToken } from '@/lib/session';
import { db } from './db';

/** Digits only, Israeli local form: +972 50-123-4567 → 0501234567 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('972') ? `0${digits.slice(3)}` : digits;
}

export function unlimitedPhones(): Set<string> {
  const raw = [process.env.OWNER_PHONE ?? '', ...(process.env.SHOP_UNLIMITED_PHONES ?? '').split(',')];
  return new Set(raw.map(normalizePhone).filter((p) => p.length >= 9));
}

function sessionToken(req: Request): string | undefined {
  const cookie = req.headers.get('cookie') ?? '';
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

/** True when the request comes from a logged-in owner (or another unlimited phone). Never throws. */
export async function isUnlimitedVisitor(req: Request): Promise<boolean> {
  try {
    const phones = unlimitedPhones();
    if (phones.size === 0) return false;
    const userId = await verifySessionToken(sessionToken(req));
    if (!userId) return false;
    const user = await db.user.findUnique({ where: { id: userId }, select: { phone: true } });
    return !!user && phones.has(normalizePhone(user.phone));
  } catch {
    return false;
  }
}
