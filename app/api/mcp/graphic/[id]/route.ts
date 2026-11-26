import { getSession } from '@/lib/session';
import { enabledUser, ORIGIN, privateHeaders } from '@/lib/mcp-auth';
import { getRole, ToolError } from '@/lib/mcp-recruiting';
import { renderRecruitmentPoster } from '@/lib/mcp-poster';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    const url = new URL('/login', ORIGIN);
    url.searchParams.set('next', '/api/mcp/graphic/' + encodeURIComponent(params.id));
    return Response.redirect(url, 303);
  }
  const user = await enabledUser(session.id);
  if (!user) return new Response('MCP access is disabled.', { status: 403, headers: privateHeaders });
  if (!/^[1-9]\d{0,9}$/.test(params.id)) return new Response('Invalid requirement.', { status: 400 });
  let role;
  try { role = await getRole(user, Number(params.id)); }
  catch (e) { if (e instanceof ToolError) return new Response(e.message, { status: 404, headers: privateHeaders }); throw e; }
  const application = role.applications_open ? ORIGIN + '/careers/' + role.requirement_id : null;
  const png = await renderRecruitmentPoster(role, application);
  return new Response(new Uint8Array(png), {
    headers: { ...privateHeaders, 'Content-Type': 'image/png', 'Content-Disposition': 'inline; filename="atlis-role-' + role.requirement_id + '.png"', 'X-Content-Type-Options': 'nosniff' },
  });
}
export const dynamic = 'force-dynamic';
