import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { one } from '@/lib/db';
import { beginChallenge, checkOrigin, clientIp, error, loginLimited } from '@/lib/auth-challenge';

export async function POST(req: Request) {
  if (!checkOrigin(req)) return error(403, 'Invalid request origin.');
  const { email, password } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || email.length > 254 || password.length > 1024) return NextResponse.json({ status: 'error', message: 'Enter your email and password.' }, { status: 400 });
  const requestIp = clientIp(req) || 'unknown';
  if (await loginLimited(email.trim(), requestIp)) return error(429, 'Too many sign-in attempts. Try again in 15 minutes.');
  const u = await one<any>('SELECT * FROM users WHERE email=? AND IFNULL(deleted,0)=0 ORDER BY id DESC LIMIT 1', [String(email).trim()]);
  const generic = NextResponse.json({ status: 'error', message: 'Email or password is incorrect, or the account is not active.' }, { status: 401 });
  if (!u || Number(u.status) !== 1 || Number(u.isLogin) !== 1 || !u.password) return generic;

  const ip = clientIp(req);
  if (Number(u.publicip) === 0 && u.ipAddress) {
    const allowed = String(u.ipAddress).split(',').map((s: string) => s.trim());
    if (!ip || !allowed.includes(ip)) return NextResponse.json({ status: 'error', message: 'Access denied. Your IP address is not authorised for this account.' }, { status: 403 });
  }
  const hash = String(u.password).replace(/^\$2y\$/, '$2b$');
  if (!(await bcrypt.compare(String(password), hash))) return generic;

  return beginChallenge(u);
}

export const dynamic = 'force-dynamic';
