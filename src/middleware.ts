import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static files
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const userId = req.cookies.get(SESSION_COOKIE)?.value;

  if (!userId) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
