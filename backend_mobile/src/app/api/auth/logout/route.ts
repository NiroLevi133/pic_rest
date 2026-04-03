import { NextResponse } from 'next/server';

export async function POST() {
  // Mobile: stateless — client simply discards the token
  return NextResponse.json({ success: true });
}
