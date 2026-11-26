import { ORIGIN, RESOURCE, SCOPE } from '@/lib/mcp-auth';

export function GET(_req: Request, { params }: { params: { metadata: string[] } }) {
  const path = params.metadata.join('/');
  if (['oauth-protected-resource', 'oauth-protected-resource/api/mcp'].includes(path)) {
    return Response.json({ resource: RESOURCE, authorization_servers: [ORIGIN], scopes_supported: [SCOPE], bearer_methods_supported: ['header'], resource_name: 'Atlis Recruiting' });
  }
  if (path === 'oauth-authorization-server') {
    const base = ORIGIN + '/api/mcp/oauth/';
    return Response.json({
      issuer: ORIGIN, authorization_endpoint: base + 'authorize', token_endpoint: base + 'token',
      registration_endpoint: base + 'register',
      scopes_supported: [SCOPE], response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    });
  }
  return new Response(null, { status: 404 });
}
export const dynamic = 'force-dynamic';
