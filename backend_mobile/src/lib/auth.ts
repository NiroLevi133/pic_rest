import { NextRequest } from 'next/server';
import { prisma } from './prisma';

export const SESSION_COOKIE = 'restorante_uid';

/** Get userId from a request (API routes) — supports both cookie and Authorization header */
export function getUserIdFromRequest(req: NextRequest): string | null {
  // Support Bearer token for mobile clients
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7) || null;
  }
  // Fallback: cookie (for web compatibility)
  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}

/** Find or create user by phone number */
export async function findOrCreateUser(phone: string): Promise<{ id: string; phone: string }> {
  const normalized = phone.replace(/\D/g, ''); // digits only
  const user = await prisma.user.upsert({
    where: { phone: normalized },
    update: {},
    create: { phone: normalized },
  });
  return user;
}
