import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC = [/^\/login/, /^\/forgot-password/, /^\/reset-password/, /^\/careers/, /^\/consent\//, /^\/register\//, /^\/api\//, /^\/_next\//, /^\/brand\//, /^\/favicon/, /\.(png|svg|ico|webmanifest|jpg|txt)$/];
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  const token = req.cookies.get('atlis_session')?.value;
  let ok = false;
  if (token) {
    try { await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || 'insecure-dev-secret-change-me')); ok = true; } catch { ok = false; }
  }
  if (!ok) {
    const url = req.nextUrl.clone(); url.pathname = '/login'; url.search = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname + req.nextUrl.search)}` : '';
    return NextResponse.redirect(url);
  }
  if (pathname === '/') { const url = req.nextUrl.clone(); url.pathname = '/dashboard'; return NextResponse.redirect(url); }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
