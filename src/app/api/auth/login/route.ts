import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUser, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || String(phone).replace(/\D/g, '').length < 9) {
      return NextResponse.json({ success: false, error: 'מספר טלפון לא תקין' }, { status: 400 });
    }

    const user = await findOrCreateUser(String(phone));

    const res = NextResponse.json({ success: true, data: { userId: user.id, phone: user.phone } });
    res.cookies.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return res;
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
