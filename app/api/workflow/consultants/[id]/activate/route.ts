import crypto from 'node:crypto';
import { handler, ok, fail, moduleFor, HttpError } from '@/lib/api';
import { exec, one } from '@/lib/db';
import { getRecord, insertRow } from '@/lib/crud';
import { sendMail, renderBrandedEmail } from '@/lib/mail';
import { getSettings } from '@/lib/settings';

/** Create (or re-invite) the consultant's portal account and email an activation link. */
type Ctx = { params: { id: string } };
export const POST = handler<Ctx>(async (_req, { params }, user) => {
  const m = await moduleFor('consultants', user, 'edit');
  const c = await getRecord(m, user, params.id);
  if (!c) throw new HttpError(404, 'Consultant not found');
  if (!c.candidateEmailID) return fail(400, 'Add the consultant’s email address first.');
  let u = await one<any>('SELECT id FROM users WHERE email=? AND deleted=0', [c.candidateEmailID]);
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
  const [first, ...rest] = String(c.candidateName || '').split(' ');
  if (!u) {
    u = { id: await insertRow('users', { role_type: '16', profileID: c.profileID, companyID: c.companyID, subVendorID: c.subVendorID, first_name: first, last_name: rest.join(' '), email: c.candidateEmailID, emailKey: hash, activationMailExpiredAt: expires, isActivationMailSent: 1, status: 1, isLogin: 1, deleted: 0, contact_no: c.primaryContactNo || '' }) };
    await exec('INSERT INTO role_admin (role_id, user_id) VALUES (16, ?)', [u.id]).catch(() => {});
  } else {
    await exec('UPDATE users SET emailKey=?, activationMailExpiredAt=?, isActivationMailSent=1 WHERE id=?', [hash, expires, u.id]);
  }
  await exec('UPDATE candidate_data SET isActivationMailSent=1, userID=? WHERE cdID=?', [u.id, params.id]);
  const st = await getSettings();
  const link = `${process.env.APP_URL || ''}/reset-password/${token}?welcome=1`;
  const res = await sendMail({ to: c.candidateEmailID, subject: `Your ${st.brand_name} account`, html: renderBrandedEmail(st, `<p>Hi ${first || ''},</p><p>Your consultant account is ready. Use the button below to set your password. You can then submit timesheets, invoices and expenses online.</p><p><a class="btn" href="${link}">Activate account</a></p><p>The link expires in 72 hours.</p>`) });
  return ok({ status: 'success', message: res.sent ? 'Activation email sent' : 'Account created. SMTP is not configured, so copy this link to the consultant.', link: res.sent ? undefined : link });
});

export const dynamic = 'force-dynamic';
