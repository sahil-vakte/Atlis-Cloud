import { NextResponse } from 'next/server';
import { activeChallenge, challengeDetails, checkOrigin, completeChallenge, enrollmentDetails, error } from '@/lib/auth-challenge';
export const dynamic = 'force-dynamic';
export async function GET() {
  const row = await challengeDetails();
  if (!activeChallenge(row)) return error(401, 'Sign in with your password again.');
  return NextResponse.json(await enrollmentDetails(row), { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
export async function POST(req: Request) {
  if (!checkOrigin(req)) return error(403, 'Invalid request origin.');
  const { code } = await req.json().catch(() => ({}));
  return completeChallenge(req, typeof code === 'string' ? code.trim() : '');
}
