import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export type SessionUser = {
  id: number; role: number; name: string; email: string;
  profileID: number | null; companyID: number | null; subVendorID: number | null; viewOnly: boolean;
};
export const COOKIE = 'atlis_session';
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'insecure-dev-secret-change-me');

export async function signSession(u: SessionUser) {
  const hours = Number(process.env.SESSION_HOURS || 12);
  return new SignJWT({ u, mfa: true, purpose: 'session' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${hours}h`).sign(secret());
}
export async function verifySession(token?: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.mfa !== true || payload.purpose !== 'session') return null;
    return (payload as any).u as SessionUser;
  } catch {
    return null;
  }
}
export async function getSession(): Promise<SessionUser | null> {
  const session = await verifySession(cookies().get(COOKIE)?.value);
  if (!session) return null;
  const { one } = await import('./db');
  const active = await one('SELECT id FROM users WHERE id=? AND role_type=? AND status=1 AND isLogin=1 AND IFNULL(deleted,0)=0', [session.id, session.role]);
  return active ? session : null;
}
