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
  return new SignJWT({ u }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${hours}h`).sign(secret());
}
export async function verifySession(token?: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return (payload as any).u as SessionUser;
  } catch {
    return null;
  }
}
export async function getSession(): Promise<SessionUser | null> {
  return verifySession(cookies().get(COOKIE)?.value);
}
