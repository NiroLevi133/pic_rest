import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUser, SESSION_COOKIE } from '@/lib/auth';
import { createSessionToken, SESSION_MAX_AGE } from '@/lib/session';

// Best-effort per-instance rate limit: 10 attempts per IP per minute.
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ success: false, error: 'יותר מדי ניסיונות — נסה שוב בעוד דקה' }, { status: 429 });
  }

  try {
    const { phone } = await req.json();

    if (!phone || String(phone).replace(/\D/g, '').length < 9) {
      return NextResponse.json({ success: false, error: 'מספר טלפון לא תקין' }, { status: 400 });
    }

    const user = await findOrCreateUser(String(phone));

    const res = NextResponse.json({ success: true, data: { userId: user.id, phone: user.phone, role: user.role } });
    res.cookies.set(SESSION_COOKIE, await createSessionToken(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return res;
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json({ success: false, error: 'שגיאה בהתחברות' }, { status: 500 });
  }
}
