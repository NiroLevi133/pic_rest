import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || String(phone).replace(/\D/g, '').length < 9) {
      return NextResponse.json({ success: false, error: 'מספר טלפון לא תקין' }, { status: 400 });
    }

    const user = await findOrCreateUser(String(phone));

    // Mobile: return userId as token in the response body (no cookies needed)
    return NextResponse.json({
      success: true,
      data: { userId: user.id, phone: user.phone, token: user.id },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
