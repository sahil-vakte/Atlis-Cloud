import bcrypt from 'bcryptjs';
import { handler, ok, fail } from '@/lib/api';
import { exec } from '@/lib/db';
import { ADMIN_ROLE } from '@/lib/permissions';
import { passwordProblem } from '@/lib/password';
type Ctx = { params: { id: string } };
export const POST = handler<Ctx>(async (req, { params }, user) => {
  if (user.role !== ADMIN_ROLE) return fail(403, 'Only administrators can reset passwords');
  const { password } = await req.json();
  const p = passwordProblem(password); if (p) return fail(400, p);
  await exec('UPDATE users SET password=?, pass_word=NULL, isUserUpdatedPassword=0, userUpdatedPasswordAt=NOW() WHERE id=?', [await bcrypt.hash(password, 10), params.id]);
  return ok({ status: 'success', message: 'Password updated. The user will be asked to change it at next sign-in.' });
});

export const dynamic = 'force-dynamic';
