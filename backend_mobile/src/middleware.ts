import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/api/auth/login', '/api/generate-callback'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static Next.js files
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // All public endpoints — no auth required
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Add CORS headers for mobile app
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(o => o.trim());

  const res = NextResponse.next();

  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    res.headers.set('Access-Control-Allow-Origin', origin || '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: res.headers });
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
