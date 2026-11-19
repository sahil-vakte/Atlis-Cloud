import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/session';
export async function POST() {
  const res = NextResponse.json({ status: 'success' });
  res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}

export const dynamic = 'force-dynamic';
