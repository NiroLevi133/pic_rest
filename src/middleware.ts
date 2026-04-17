import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/generate-callback'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const userId = req.cookies.get(SESSION_COOKIE)?.value;

  // Redirect logged-in users away from login page
  if (userId && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/menu', req.url));
  }

  // Redirect unauthenticated users to login
  if (!userId && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
