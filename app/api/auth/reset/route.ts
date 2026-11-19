import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { exec, one } from '@/lib/db';
import { passwordProblem } from '@/lib/password';

export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  const problem = passwordProblem(password);
  if (!token) return Response.json({ status: 'error', message: 'Invalid link.' }, { status: 400 });
  if (problem) return Response.json({ status: 'error', message: problem }, { status: 400 });
  const hashToken = crypto.createHash('sha256').update(String(token)).digest('hex');
  const u = await one<any>('SELECT id, activationMailExpiredAt FROM users WHERE emailKey=?', [hashToken]);
  if (!u || !u.activationMailExpiredAt || new Date(u.activationMailExpiredAt).getTime() < Date.now())
    return Response.json({ status: 'error', message: 'This link has expired. Please request a new one.' }, { status: 400 });
  await exec('UPDATE users SET password=?, pass_word=NULL, emailKey=NULL, activationMailExpiredAt=NULL, isUserUpdatedPassword=1, userUpdatedPasswordAt=NOW(), status=1 WHERE id=?', [await bcrypt.hash(password, 10), u.id]);
  return Response.json({ status: 'success', message: 'Password updated. You can now sign in.' });
}

export const dynamic = 'force-dynamic';
