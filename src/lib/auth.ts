import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';

export const SESSION_COOKIE = 'restorante_uid';

/** Get userId from cookie (server-side) */
export async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/** Get userId from a request (API routes) */
export function getUserIdFromRequest(req: NextRequest): string | null {
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
