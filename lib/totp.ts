import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Secret, TOTP } from 'otpauth';

export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function key() {
  const value = process.env.MFA_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error('MFA encryption key is not configured');
  return Buffer.from(value, 'hex');
}
export function encryptSecret(secret: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(b => b.toString('base64url')).join('.');
}
export function decryptSecret(value: string) {
  const [iv, tag, data] = value.split('.').map(s => Buffer.from(s, 'base64url'));
  const cipher = createDecipheriv('aes-256-gcm', key(), iv); cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
}
export const newSecret = () => new Secret({ size: 20 }).base32;
export const authenticator = (secret: string, email = 'Account') => new TOTP({ issuer: 'Atlis Cloud', label: email, algorithm: 'SHA1', digits: 6, period: 30, secret: Secret.fromBase32(secret) });
export function validCounter(secret: string, token: string, lastCounter: number, timestamp = Date.now()) {
  if (!/^\d{6}$/.test(token)) return null;
  const delta = authenticator(secret).validate({ token, window: 1, timestamp });
  if (delta === null) return null;
  const counter = Math.floor(timestamp / 30000) + delta;
  return counter > lastCounter ? counter : null;
}
