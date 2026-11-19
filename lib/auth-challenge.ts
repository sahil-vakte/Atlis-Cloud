import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { exec, one, pool } from './db';
import { authenticator, decryptSecret, digest, encryptSecret, newSecret, validCounter } from './totp';
import { COOKIE, signSession, type SessionUser } from './session';

export const CHALLENGE_COOKIE = 'atlis_challenge';
// Nginx overwrites X-Real-IP; a client can prepend entries to X-Forwarded-For.
export const clientIp = (req: Request) => req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '';
export const cookieOptions = () => ({ httpOnly: true, sameSite: 'lax' as const, secure: (process.env.APP_URL || '').startsWith('https:'), path: '/' });
export function checkOrigin(req: Request) {
  const origin = req.headers.get('origin');
  return !origin || origin === new URL(process.env.APP_URL || req.url).origin;
}
export async function loginLimited(email: string, ip: string) {
  for (const [value, max] of [[`email:${email.toLowerCase()}`, 10], [`ip:${ip}`, 50]] as const) {
    const bucket = digest(value);
    await exec('INSERT INTO app_auth_limits(bucket,attempts,resets_at) VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE)) ON DUPLICATE KEY UPDATE attempts=IF(resets_at<=UTC_TIMESTAMP(),1,attempts+1), resets_at=IF(resets_at<=UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE),resets_at)', [bucket]);
    const row = await one<any>('SELECT attempts FROM app_auth_limits WHERE bucket=?', [bucket]);
    if (Number(row.attempts) > max) return true;
  }
  await exec('DELETE FROM app_auth_limits WHERE resets_at < DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 DAY) LIMIT 100');
  return false;
}
export async function beginChallenge(u: any) {
  await exec('INSERT IGNORE INTO app_user_mfa(user_id,secret_cipher) VALUES (?,?)', [u.id, encryptSecret(newSecret())]);
  const token = randomBytes(32).toString('base64url');
  await exec('DELETE FROM app_auth_challenges WHERE expires_at < UTC_TIMESTAMP() LIMIT 100');
  await exec('INSERT INTO app_auth_challenges(token_hash,user_id,password_fingerprint,expires_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE))', [digest(token), u.id, digest(String(u.password))]);
  const res = NextResponse.json({ status: 'mfa_required' }, { headers: { 'Cache-Control': 'no-store' } });
  res.cookies.set(CHALLENGE_COOKIE, token, { ...cookieOptions(), maxAge: 600 });
  res.cookies.set(COOKIE, '', { ...cookieOptions(), maxAge: 0 });
  return res;
}
export async function challengeDetails() {
  const token = cookies().get(CHALLENGE_COOKIE)?.value;
  if (!token) return null;
  return one<any>(`SELECT c.token_hash,c.password_fingerprint,m.*,u.email,u.password,u.status,u.isLogin,u.deleted
    FROM app_auth_challenges c JOIN app_user_mfa m ON m.user_id=c.user_id JOIN users u ON u.id=c.user_id
    WHERE c.token_hash=? AND c.expires_at>UTC_TIMESTAMP()`, [digest(token)]);
}
export function activeChallenge(row: any) {
  return row && Number(row.status) === 1 && Number(row.isLogin) === 1 && !Number(row.deleted) && digest(String(row.password)) === row.password_fingerprint;
}
export async function enrollmentDetails(row: any) {
  if (Number(row.enabled)) return { setup: false };
  const secret = decryptSecret(row.secret_cipher);
  return { setup: true, secret, qr: await QRCode.toDataURL(authenticator(secret, row.email).toString(), { width: 256, margin: 2, errorCorrectionLevel: 'M' }) };
}
export async function completeChallenge(req: Request, code: string) {
  const token = cookies().get(CHALLENGE_COOKIE)?.value;
  if (!token) return error(401, 'Sign in with your password again.');
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const [rows]: any = await db.query('SELECT * FROM app_auth_challenges WHERE token_hash=? AND expires_at>UTC_TIMESTAMP() FOR UPDATE', [digest(token)]);
    const challenge = rows[0];
    if (!challenge) { await db.rollback(); return error(401, 'This sign-in has expired. Start again.'); }
    const [users]: any = await db.query('SELECT * FROM users WHERE id=?', [challenge.user_id]);
    const u = users[0];
    if (!activeChallenge({ ...u, password_fingerprint: challenge.password_fingerprint })) { await db.rollback(); return error(401, 'Your account has changed. Sign in again.'); }
    const ip = clientIp(req);
    if (Number(u.publicip) === 0 && u.ipAddress && (!ip || !String(u.ipAddress).split(',').map(v => v.trim()).includes(ip))) { await db.rollback(); return error(403, 'Your IP address is not authorised.'); }
    const [states]: any = await db.query('SELECT *,locked_until>UTC_TIMESTAMP() AS locked FROM app_user_mfa WHERE user_id=? FOR UPDATE', [u.id]);
    const state = states[0];
    if (!state) { await db.rollback(); return error(401, 'Start sign-in again.'); }
    if (state.locked) { await db.rollback(); return error(429, 'Too many attempts. Wait 15 minutes before trying again.'); }
    const counter = validCounter(decryptSecret(state.secret_cipher), code, Number(state.last_counter));
    if (counter === null) {
      const failures = state.locked_until ? 1 : Number(state.failed_attempts) + 1;
      await db.query('UPDATE app_user_mfa SET failed_attempts=?,locked_until=IF(? >= 5,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE),NULL) WHERE user_id=?', [failures, failures, u.id]);
      await db.commit();
      return error(failures >= 5 ? 429 : 400, failures >= 5 ? 'Too many attempts. Try again in 15 minutes.' : 'Invalid or already used code. Enter the latest code from your authenticator.');
    }
    await db.query('UPDATE app_user_mfa SET enabled=1,last_counter=?,failed_attempts=0,locked_until=NULL WHERE user_id=?', [counter, u.id]);
    await db.query('DELETE FROM app_auth_challenges WHERE token_hash=?', [digest(token)]);
    await db.commit();
    const s: SessionUser = { id: Number(u.id), role: Number(u.role_type), email: u.email, name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email, profileID: u.profileID ? Number(u.profileID) : null, companyID: u.companyID ? Number(u.companyID) : null, subVendorID: u.subVendorID ? Number(u.subVendorID) : null, viewOnly: Number(u.IsViewOnlyAccess) === 1 };
    try { await exec('INSERT INTO login_logs(user_id,email,ip_address,publicIPAddress,role_type) VALUES (?,?,?,?,?)', [u.id,u.email,ip,ip,u.role_type]); } catch {}
    const res = NextResponse.json({ status: 'success', mustChangePassword: Number(u.isUserUpdatedPassword) === 0 && Number(u.role_type) !== 1 }, { headers: { 'Cache-Control': 'no-store' } });
    res.cookies.set(COOKIE, await signSession(s), { ...cookieOptions(), maxAge: 3600 * Number(process.env.SESSION_HOURS || 12) });
    res.cookies.set(CHALLENGE_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
    return res;
  } catch (e) { await db.rollback(); throw e; } finally { db.release(); }
}
export const error = (status: number, message: string) => NextResponse.json({ status: 'error', message }, { status, headers: { 'Cache-Control': 'no-store' } });
