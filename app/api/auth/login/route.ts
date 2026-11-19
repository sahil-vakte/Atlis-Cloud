import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { exec, one } from '@/lib/db';
import { COOKIE, signSession, type SessionUser } from '@/lib/session';

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ status: 'error', message: 'Enter your email and password.' }, { status: 400 });
  const u = await one<any>('SELECT * FROM users WHERE email=? AND IFNULL(deleted,0)=0 ORDER BY id DESC LIMIT 1', [String(email).trim()]);
  const generic = NextResponse.json({ status: 'error', message: 'Email or password is incorrect, or the account is not active.' }, { status: 401 });
  if (!u || Number(u.status) !== 1 || Number(u.isLogin) !== 1 || !u.password) return generic;

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  if (Number(u.publicip) === 0 && u.ipAddress) {
    const allowed = String(u.ipAddress).split(',').map((s: string) => s.trim());
    if (ip && !allowed.includes(ip)) return NextResponse.json({ status: 'error', message: 'Access denied. Your IP address is not authorised for this account.' }, { status: 403 });
  }
  const hash = String(u.password).replace(/^\$2y\$/, '$2b$');
  if (!(await bcrypt.compare(String(password), hash))) return generic;

  const s: SessionUser = {
    id: Number(u.id), role: Number(u.role_type), email: u.email,
    name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
    profileID: u.profileID ? Number(u.profileID) : null, companyID: u.companyID ? Number(u.companyID) : null,
    subVendorID: u.subVendorID ? Number(u.subVendorID) : null, viewOnly: Number(u.IsViewOnlyAccess) === 1,
  };
  try { await exec('INSERT INTO login_logs (user_id,email,ip_address,publicIPAddress,role_type) VALUES (?,?,?,?,?)', [u.id, u.email, ip, ip, u.role_type]); } catch {}
  const res = NextResponse.json({ status: 'success', user: s, mustChangePassword: Number(u.isUserUpdatedPassword) === 0 && Number(u.role_type) !== 1 });
  res.cookies.set(COOKIE, await signSession(s), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' && (process.env.APP_URL || '').startsWith('https'), path: '/', maxAge: 3600 * Number(process.env.SESSION_HOURS || 12) });
  return res;
}

export const dynamic = 'force-dynamic';
