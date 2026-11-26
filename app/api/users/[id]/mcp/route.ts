import { handler, HttpError, ok } from '@/lib/api';
import { one } from '@/lib/db';
import { allowedRedirect, INTERNAL, issueUserClient, ORIGIN, privateHeaders, transaction } from '@/lib/mcp-auth';

const claudeCallback = 'https://claude.ai/api/mcp/auth_callback';

export const POST = handler<{ params: { id: string } }>(async (req, { params }, user) => {
  if (user.role !== 1 || user.viewOnly || req.headers.get('origin') !== ORIGIN) throw new HttpError(403, 'Only an Atlis administrator can manage MCP access.');
  if (!/^[1-9]\d{0,9}$/.test(params.id)) throw new HttpError(400, 'Invalid user ID');
  const id = Number(params.id);
  const body = await req.json();
  const target = await one<{ role: number; active: number }>('SELECT role_type role, (status=1 AND isLogin=1 AND IFNULL(deleted,0)=0) active FROM users WHERE id=?', [id]);
  if (!target) throw new HttpError(404, 'User not found');
  const eligible = INTERNAL.includes(Number(target.role)) && Number(target.active) === 1;
  if (body.action === 'issue_client') {
    const platform = body.platform;
    const redirect = body.redirect_uri;
    if (!eligible || !['claude','chatgpt'].includes(platform) || typeof redirect !== 'string' || !allowedRedirect(redirect)
      || ((platform === 'claude') !== (redirect === claudeCallback))) throw new HttpError(400, 'Use the exact OAuth callback for the selected platform.');
    const client = await transaction(async (db) => {
      const [rows] = await db.query('SELECT enabled FROM atlis_mcp_access WHERE user_id=? FOR UPDATE', [id]);
      if (Number((rows as { enabled: number }[])[0]?.enabled) !== 1) throw new HttpError(400, 'Enable MCP access before creating credentials.');
      const client = await issueUserClient(db, id, platform, redirect);
      await db.query("INSERT INTO atlis_mcp_audit (user_id,action,record_id) VALUES (?,'client_issued',?)", [user.id, id]);
      return client;
    });
    return ok({ client }, { headers: privateHeaders });
  }
  const { enabled } = body;
  if (typeof enabled !== 'boolean') throw new HttpError(400, 'Choose whether to enable MCP access.');
  if (enabled && !eligible) throw new HttpError(400, 'Only active internal users are eligible.');
  const client = await transaction(async (db) => {
    const [rows] = await db.query('SELECT enabled FROM atlis_mcp_access WHERE user_id=? FOR UPDATE', [id]);
    const wasEnabled = Number((rows as { enabled: number }[])[0]?.enabled) === 1;
    await db.query('INSERT INTO atlis_mcp_access (user_id,enabled,changed_by) VALUES (?,?,?) ON DUPLICATE KEY UPDATE version=version+IF(enabled<>VALUES(enabled),1,0),enabled=VALUES(enabled),changed_by=VALUES(changed_by)', [id, enabled ? 1 : 0, user.id]);
    await db.query('INSERT INTO atlis_mcp_audit (user_id,action,record_id) VALUES (?,?,?)', [user.id, enabled ? 'access_enabled' : 'access_disabled', id]);
    if (!enabled) {
      await db.query('DELETE FROM atlis_mcp_grants WHERE user_id=?', [id]);
      await db.query('DELETE FROM atlis_mcp_clients WHERE owner_user_id=?', [id]);
      return null;
    }
    return wasEnabled ? null : issueUserClient(db, id, 'claude', claudeCallback);
  });
  return ok({ enabled, client, message: enabled ? 'MCP access enabled. Connection details are at the bottom of this record.' : 'MCP access disabled. Existing connections are revoked.' }, { headers: privateHeaders });
});
