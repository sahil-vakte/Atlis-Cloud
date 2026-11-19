import crypto from 'node:crypto';
import { exec, one } from '@/lib/db';
import { sendMail, renderBrandedEmail } from '@/lib/mail';
import { getSettings } from '@/lib/settings';

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  const generic = Response.json({ status: 'success', message: 'If that email belongs to an active account, a reset link has been sent.' });
  if (!email) return generic;
  const u = await one<any>('SELECT id, first_name, email FROM users WHERE email=? AND IFNULL(deleted,0)=0 AND status=1', [email]);
  if (!u) return generic;
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await exec('UPDATE users SET emailKey=?, activationMailExpiredAt=? WHERE id=?', [crypto.createHash('sha256').update(token).digest('hex'), expires, u.id]);
  const s = await getSettings();
  const link = `${process.env.APP_URL || ''}/reset-password/${token}`;
  await sendMail({ to: u.email, subject: `Reset your ${s.brand_name} password`, html: renderBrandedEmail(s, `<p>Hi ${u.first_name || ''},</p><p>Use the button below to choose a new password. The link expires in one hour.</p><p><a class="btn" href="${link}">Reset password</a></p><p>If you didn't ask for this, you can ignore this email.</p>`) }).catch(() => {});
  return generic;
}

export const dynamic = 'force-dynamic';
