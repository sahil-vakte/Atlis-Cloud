import { acceptConsent, allowedRedirect, boundedBody, clientFromRequest, enabledUser, exchange, issueCode, lookupClient, ORIGIN, privateHeaders, registerClient, RESOURCE, SCOPE, signConsent } from '@/lib/mcp-auth';
import { getSession } from '@/lib/session';

type Context = { params: { action: string } };
const error = (code: string, status = 400) => Response.json({ error: code }, {
  status, headers: { ...privateHeaders, ...(status === 401 ? { 'WWW-Authenticate': 'Basic realm="Atlis OAuth"' } : {}) },
});
const redirect = (url: URL) => new Response(null, { status: 303, headers: { ...privateHeaders, Location: url.toString() } });
const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]!);
const page = (content: string, status = 200, callback?: string) => new Response(
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect to Atlis</title><main><h1>Connect to Atlis Recruiting</h1>' + content + '</main></html>',
  { status, headers: { ...privateHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; form-action 'self'" + (callback && allowedRedirect(callback) ? ' ' + new URL(callback).origin : '') + "; frame-ancestors 'none'; base-uri 'none'", 'X-Content-Type-Options': 'nosniff' } }
);
const clientRedirect = (uri: string, state: string, key: string, value: string) => {
  const url = new URL(uri);
  url.searchParams.set(key, value);
  if (state) url.searchParams.set('state', state);
  return redirect(url);
};

export async function GET(req: Request, { params }: Context) {
  if (params.action !== 'authorize') return error('invalid_request', 405);
  const url = new URL(req.url);
  const p = url.searchParams;
  const id = p.get('client_id') || '';
  const uri = p.get('redirect_uri') || '';
  const client = await lookupClient(id);
  if (!client || !allowedRedirect(uri) || client.redirect_uri !== uri) return error('invalid_request');
  const state = p.get('state') || '';
  const challenge = p.get('code_challenge') || '';
  const resource = p.get('resource');
  if (state.length > 512 || p.get('response_type') !== 'code' || p.get('code_challenge_method') !== 'S256'
    || !/^[A-Za-z0-9_-]{43}$/.test(challenge) || (resource && resource !== RESOURCE)
    || p.getAll('resource').length > 1 || (p.get('scope') && p.get('scope') !== SCOPE)) {
    return clientRedirect(uri, state.slice(0, 512), 'error', 'invalid_request');
  }
  const session = await getSession();
  if (!session) {
    const login = new URL('/login', ORIGIN);
    login.searchParams.set('next', '/api/mcp/oauth/authorize' + url.search);
    return redirect(login);
  }
  const user = await enabledUser(session.id);
  if (!user) return page('<p>MCP access is disabled for this account. An Atlis administrator can enable it in User Management.</p>', 403);
  if (client.owner_user_id != null && Number(client.owner_user_id) !== user.id) return page('<p>These credentials belong to another Atlis user.</p>', 403);
  const ticket = await signConsent({ client: id, redirect: uri, state, challenge, user: user.id, version: user.version });
  const connector = uri.startsWith('https://claude.ai/') ? 'Claude' : 'ChatGPT';
  return page('<p>Signed in as ' + escape(user.name || user.email) + '.</p><p>Allow ' + connector +
    ' to use Atlis requirements and the recruiting actions your Atlis role permits.</p>' +
    '<form method="post" action="/api/mcp/oauth/authorize"><input type="hidden" name="consent" value="' + ticket +
    '"><button name="decision" value="allow">Allow access</button> <button name="decision" value="deny">Cancel</button></form>', 200, uri);
}

export async function POST(req: Request, { params }: Context) {
  let body: string;
  try { body = await boundedBody(req, 8192); } catch { return error('invalid_request', 413); }
  if (params.action === 'register') {
    try {
      const client = await registerClient(JSON.parse(body));
      return client ? Response.json(client, { status: 201, headers: privateHeaders }) : error('invalid_client_metadata');
    } catch (e) { if (e instanceof SyntaxError) return error('invalid_client_metadata'); throw e; }
  }
  const form = new URLSearchParams(body);
  if (params.action === 'authorize') {
    const origin = req.headers.get('origin');
    const site = req.headers.get('sec-fetch-site');
    // The consent page's no-referrer policy can make a same-origin browser form POST send Origin: null.
    // The signed consent ticket below still binds approval to the signed-in Atlis user and client.
    const sameOrigin = origin === ORIGIN || ((!origin || origin === 'null') && site === 'same-origin');
    if (!sameOrigin || (site && site !== 'same-origin')) {
      return page('<p>This approval must be submitted from the Atlis consent page. Restart the connection in your AI platform and try again.</p>', 403);
    }
    const session = await getSession();
    const user = session && await enabledUser(session.id);
    const consent = user && await acceptConsent(form.get('consent') || '', user);
    const client = consent && await lookupClient(consent.client);
    if (!consent || !client || !allowedRedirect(consent.redirect)
      || (client.owner_user_id != null && Number(client.owner_user_id) !== consent.user)) return page('<p>This approval expired or the Atlis account or connector credentials changed. Restart the connection in your AI platform.</p>', 403);
    if (form.get('decision') !== 'allow') return clientRedirect(consent.redirect, consent.state, 'error', 'access_denied');
    return clientRedirect(consent.redirect, consent.state, 'code', await issueCode(consent));
  }
  if (params.action === 'token') {
    const client = await clientFromRequest(req, form);
    if (!client) return error('invalid_client', 401);
    const tokens = await exchange(client, form);
    return tokens ? Response.json(tokens, { headers: privateHeaders }) : error('invalid_grant');
  }
  return error('invalid_request', 404);
}
export const dynamic = 'force-dynamic';
