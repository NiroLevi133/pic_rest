import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { verifySessionToken } from './session';

import { SESSION_COOKIE } from './constants';
export { SESSION_COOKIE };

export type UserRole = 'OWNER' | 'MEMBER' | 'STUDIO_ONLY';

/** Roles with access to the business modules (customers, quotes, receipts, dashboard). */
export const BUSINESS_ROLES: UserRole[] = ['OWNER', 'MEMBER'];

export interface SessionUser {
  id: string;
  phone: string;
  role: UserRole;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Get userId from the signed session cookie (server components). */
export async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

/** Get userId from the signed session cookie of a request (API routes). */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, phone: true, role: true } });
  return user ? { ...user, role: user.role as UserRole } : null;
}

/**
 * Resolve the session user and check their role.
 * Returns either the user or a ready-to-return error response.
 */
export async function requireRole(
  req: NextRequest,
  roles: UserRole[],
): Promise<{ user: SessionUser; error?: undefined } | { user?: undefined; error: NextResponse }> {
  const user = await getSessionUser(req);
  if (!user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  if (!roles.includes(user.role)) return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

/** Find or create user by phone number. The configured OWNER_PHONE is always promoted to OWNER. */
export async function findOrCreateUser(phone: string): Promise<{ id: string; phone: string; role: string }> {
  const normalized = normalizePhone(phone);
  const ownerPhone = normalizePhone(process.env.OWNER_PHONE ?? '');
  const isOwner = ownerPhone !== '' && normalized === ownerPhone;
  return prisma.user.upsert({
    where: { phone: normalized },
    update: isOwner ? { role: 'OWNER' } : {},
    create: { phone: normalized, role: isOwner ? 'OWNER' : 'STUDIO_ONLY' },
  });
}
