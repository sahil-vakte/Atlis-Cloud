import { handler, ok, fail } from '@/lib/api';
import { query } from '@/lib/db';
import { insertRow } from '@/lib/crud';
import { ADMIN_ROLE, clearPermissionCache } from '@/lib/permissions';

export const GET = handler(async (_r, _c, user) => {
  if (user.role !== ADMIN_ROLE) return fail(403, 'Only administrators can manage roles');
  const roles = await query<any>('SELECT r.id, r.title, r.status, (SELECT COUNT(*) FROM users u WHERE u.role_type=r.id AND u.deleted=0) users FROM roles r ORDER BY r.id');
  const perms = await query<any>("SELECT id, name, displayName, href, parent_id, is_menu, slug, status FROM permissions WHERE status=1 ORDER BY parent_id, `order`, id");
  const matrix = await query<any>('SELECT permission_id, role_id FROM permission_role');
  return ok({ roles, perms, matrix });
});
export const POST = handler(async (req, _c, user) => {
  if (user.role !== ADMIN_ROLE) return fail(403, 'Only administrators can manage roles');
  const { title } = await req.json();
  if (!title?.trim()) return fail(400, 'Enter a role name');
  const id = await insertRow('roles', { title: title.trim(), status: '1' });
  clearPermissionCache();
  return ok({ status: 'success', id, message: 'Role created' });
});

export const dynamic = 'force-dynamic';
