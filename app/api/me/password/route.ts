import bcrypt from 'bcryptjs';
import { handler, ok, fail } from '@/lib/api';
import { exec, one } from '@/lib/db';
import { passwordProblem } from '@/lib/password';
export const POST = handler(async (req, _c, user) => {
  const { current, password } = await req.json();
  const u = await one<any>('SELECT password FROM users WHERE id=?', [user.id]);
  if (!u?.password || !(await bcrypt.compare(String(current || ''), String(u.password).replace(/^\$2y\$/, '$2b$')))) return fail(400, 'Your current password is not correct.');
  const p = passwordProblem(password); if (p) return fail(400, p);
  await exec('UPDATE users SET password=?, pass_word=NULL, isUserUpdatedPassword=1, userUpdatedPasswordAt=NOW() WHERE id=?', [await bcrypt.hash(password, 10), user.id]);
  return ok({ status: 'success', message: 'Password changed' });
});

export const dynamic = 'force-dynamic';
