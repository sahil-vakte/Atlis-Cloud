import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/session';
import { CHALLENGE_COOKIE } from '@/lib/auth-challenge';
export async function POST() {
  const res = NextResponse.json({ status: 'success' });
  res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 });
  res.cookies.set(CHALLENGE_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}

export const dynamic = 'force-dynamic';
