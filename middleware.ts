import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC = [/^\/login/, /^\/forgot-password/, /^\/reset-password/, /^\/careers/, /^\/consent\//, /^\/register\//, /^\/api\//, /^\/_next\//, /^\/brand\//, /^\/favicon/, /\.(png|svg|ico|webmanifest|jpg|txt)$/];
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/' || pathname === '/robots.txt' || pathname === '/sitemap.xml') return NextResponse.next();
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  const token = req.cookies.get('atlis_session')?.value;
  let ok = false;
  if (token) {
    try { const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || 'insecure-dev-secret-change-me')); ok = payload.mfa === true && payload.purpose === 'session'; } catch { ok = false; }
  }
  if (!ok) {
    const url = new URL('/login', process.env.APP_URL || req.url); url.search = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname + req.nextUrl.search)}` : '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
