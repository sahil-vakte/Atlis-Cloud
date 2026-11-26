import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { PoolConnection } from 'mysql2/promise';
import { exec, one, pool } from './db';
import type { SessionUser } from './session';

export const ORIGIN = new URL(process.env.APP_URL || 'https://atlis.cloud').origin;
export const RESOURCE = ORIGIN + '/api/mcp';
export const METADATA = ORIGIN + '/.well-known/oauth-protected-resource/api/mcp';
export const SCOPE = 'atlis:recruiting';
export const INTERNAL = [1, 2, 14, 18, 21, 22, 27, 28, 30];
export const privateHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
export const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const pkce = (value: string) => createHash('sha256').update(value).digest('base64url');
const random = () => randomBytes(32).toString('base64url');
const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const opaque = /^[A-Za-z0-9_-]{43}$/;
type Client = { id: string; secret_hash: string; redirect_uri: string; auth_method: string; owner_user_id: number | null };
type Grant = { kind: string; client_id: string; user_id: number; version: number; challenge: string | null };
type Access = SessionUser & { version: number };
type Consent = { client: string; redirect: string; state: string; challenge: string; user: number; version: number };

export async function transaction<T>(fn: (db: PoolConnection) => Promise<T>, lock?: string) {
  const db = await pool.getConnection();
  let acquired = false;
  try {
    if (lock) {
      const [rows] = await db.query('SELECT GET_LOCK(?, 5) acquired', [lock]);
      acquired = (rows as { acquired: number }[])[0]?.acquired === 1;
      if (!acquired) throw new Error('The Atlis operation is busy.');
    }
    await db.beginTransaction();
    const result = await fn(db);
    await db.commit();
    return result;
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    try { if (acquired) await db.query('SELECT RELEASE_LOCK(?)', [lock]); }
    finally { db.release(); }
  }
}

export function allowedRedirect(value: string) {
  return value === 'https://claude.ai/api/mcp/auth_callback'
    || value === 'https://chatgpt.com/connector_platform_oauth_redirect'
    || /^https:\/\/chatgpt\.com\/connector\/oauth\/[A-Za-z0-9_-]{1,100}$/.test(value);
}

export async function enabledUser(id: number): Promise<Access | null> {
  const row = await one<any>(
    'SELECT u.id,u.role_type role,u.email,u.profileID,u.companyID,u.subVendorID,u.IsViewOnlyAccess viewOnly,a.version,' +
    "TRIM(CONCAT_WS(' ',u.first_name,u.last_name)) name FROM users u JOIN atlis_mcp_access a ON a.user_id=u.id " +
    'WHERE u.id=? AND a.enabled=1 AND u.status=1 AND u.isLogin=1 AND IFNULL(u.deleted,0)=0', [id]);
  return row && INTERNAL.includes(Number(row.role))
    ? { ...row, id: Number(row.id), role: Number(row.role), viewOnly: Number(row.viewOnly) === 1, version: Number(row.version) }
    : null;
}

export async function registerClient(data: any) {
  const redirects = data?.redirect_uris;
  const method = data?.token_endpoint_auth_method || 'client_secret_basic';
  if (!Array.isArray(redirects) || redirects.length !== 1 || typeof redirects[0] !== 'string' || !allowedRedirect(redirects[0])
    || !['client_secret_basic', 'client_secret_post'].includes(method)) return null;
  const id = random();
  const secret = random();
  await exec('INSERT INTO atlis_mcp_clients (id,secret_hash,redirect_uri,auth_method) VALUES (?,?,?,?)', [id, sha(secret), redirects[0], method]);
  return {
    client_id: id, client_secret: secret, client_secret_expires_at: 0,
    redirect_uris: redirects, token_endpoint_auth_method: method,
    grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'],
    scope: SCOPE,
  };
}

export async function issueUserClient(db: PoolConnection, owner: number, platform: 'claude' | 'chatgpt', redirect: string) {
  const id = random();
  const secret = random();
  await db.query('DELETE g FROM atlis_mcp_grants g JOIN atlis_mcp_clients c ON c.id=g.client_id WHERE c.owner_user_id=? AND c.platform=?', [owner, platform]);
  await db.query('DELETE FROM atlis_mcp_clients WHERE owner_user_id=? AND platform=?', [owner, platform]);
  await db.query('INSERT INTO atlis_mcp_clients (id,secret_hash,redirect_uri,auth_method,owner_user_id,platform) VALUES (?,?,?,?,?,?)',
    [id, sha(secret), redirect, 'client_secret_post', owner, platform]);
  return { platform, client_id: id, client_secret: secret, redirect_uri: redirect };
}

export const lookupClient = (id: string) =>
  opaque.test(id) ? one<Client>('SELECT * FROM atlis_mcp_clients WHERE id=?', [id]) : Promise.resolve(null);

function consentKey() {
  const key = process.env.JWT_SECRET;
  if (!key || key.length < 32) throw new Error('OAuth signing key is unavailable');
  return createHash('sha256').update('atlis-mcp-consent-v1:').update(key).digest();
}

export async function signConsent(value: Consent) {
  return new SignJWT({ consent: value }).setProtectedHeader({ alg: 'HS256' })
    .setAudience(RESOURCE).setIssuer(ORIGIN).setIssuedAt().setExpirationTime('5m').sign(consentKey());
}

export async function acceptConsent(signed: string, user: Access) {
  try {
    const { payload } = await jwtVerify(signed, consentKey(), { algorithms: ['HS256'], audience: RESOURCE, issuer: ORIGIN });
    const consent = payload.consent as Consent;
    if (consent.user !== user.id || consent.version !== user.version) return null;
    return consent;
  } catch { return null; }
}

export async function issueCode(consent: Consent) {
  const code = random();
  await exec('INSERT INTO atlis_mcp_grants VALUES (?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 2 MINUTE))',
    [sha(code), 'code', consent.client, consent.user, consent.version, consent.challenge]);
  return code;
}

export async function clientFromRequest(req: Request, form: URLSearchParams) {
  let id = form.get('client_id') || '';
  let supplied = form.get('client_secret') || '';
  let method = 'client_secret_post';
  const authorization = req.headers.get('authorization');
  if (authorization) {
    if (!authorization.startsWith('Basic ') || supplied) return null;
    const raw = Buffer.from(authorization.slice(6), 'base64').toString();
    const split = raw.indexOf(':');
    if (split < 1) return null;
    const basicId = raw.slice(0, split);
    if (id && id !== basicId) return null;
    id = basicId;
    supplied = raw.slice(split + 1);
    method = 'client_secret_basic';
  }
  if (!opaque.test(supplied)) return null;
  const client = await lookupClient(id);
  return client && (client.owner_user_id != null || client.auth_method === method) && safeEqual(client.secret_hash, sha(supplied)) ? client : null;
}

export async function exchange(client: Client, form: URLSearchParams) {
  const codeFlow = form.get('grant_type') === 'authorization_code';
  const token = form.get(codeFlow ? 'code' : 'refresh_token') || '';
  const verifier = form.get('code_verifier') || '';
  if (!opaque.test(token) || (!codeFlow && form.get('grant_type') !== 'refresh_token')
    || (codeFlow && (form.get('redirect_uri') !== client.redirect_uri || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)))) return null;
  const [resource] = form.getAll('resource');
  if ((resource && resource !== RESOURCE) || form.getAll('resource').length > 1) return null;
  const tokenHash = sha(token);
  return transaction(async (db) => {
    const [rows] = await db.query('SELECT kind,client_id,user_id,version,challenge FROM atlis_mcp_grants WHERE token_hash=? AND expires>NOW() FOR UPDATE', [tokenHash]);
    const row = (rows as Grant[])[0];
    if (!row || row.kind !== (codeFlow ? 'code' : 'refresh') || row.client_id !== client.id
      || (codeFlow && (!row.challenge || !safeEqual(row.challenge, pkce(verifier))))) return null;
    const user = await enabledUser(row.user_id);
    if (!user || user.version !== row.version || (client.owner_user_id != null && Number(client.owner_user_id) !== user.id)) return null;
    await db.query('DELETE FROM atlis_mcp_grants WHERE token_hash=?', [tokenHash]);
    const access = random();
    const refresh = random();
    for (const [value, kind, seconds] of [[access, 'access', 900], [refresh, 'refresh', 2592000]]) {
      await db.query('INSERT INTO atlis_mcp_grants VALUES (?,?,?,?,?,NULL,TIMESTAMPADD(SECOND,?,NOW()))',
        [sha(String(value)), kind, client.id, user.id, user.version, seconds]);
    }
    return { access_token: access, token_type: 'Bearer', refresh_token: refresh, expires_in: 900, scope: SCOPE };
  });
}

export async function bearerUser(req: Request) {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(req.headers.get('authorization') || '');
  if (!match) return null;
  const row = await one<Grant>("SELECT g.user_id,g.version FROM atlis_mcp_grants g JOIN atlis_mcp_clients c ON c.id=g.client_id WHERE g.token_hash=? AND g.kind='access' AND g.expires>NOW()", [sha(match[1])]);
  if (!row) return null;
  const user = await enabledUser(row.user_id);
  return user && user.version === row.version ? user : null;
}

export function authChallenge(invalid = false) {
  return 'Bearer resource_metadata="' + METADATA + '", scope="' + SCOPE + '"' + (invalid ? ', error="invalid_token"' : '');
}

export async function boundedBody(req: Request, limit = 65536) {
  const reader = req.body?.getReader();
  if (!reader) return '';
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new Error('Request too large'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}
