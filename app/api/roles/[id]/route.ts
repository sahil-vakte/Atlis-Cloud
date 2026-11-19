import { handler, ok, fail } from '@/lib/api';
import { exec } from '@/lib/db';
import { pool } from '@/lib/db';
import { ADMIN_ROLE, clearPermissionCache } from '@/lib/permissions';

type Ctx = { params: { id: string } };
export const PUT = handler<Ctx>(async (req, { params }, user) => {
  if (user.role !== ADMIN_ROLE) return fail(403, 'Only administrators can manage roles');
  const { title, status, permissionIds } = await req.json();
  const id = Number(params.id);
  if (id === ADMIN_ROLE && Array.isArray(permissionIds) && !permissionIds.length) return fail(400, 'The Admin role must keep at least one permission');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (title != null) await conn.query('UPDATE roles SET title=?, status=? WHERE id=?', [title, String(status ?? 1), id]);
    if (Array.isArray(permissionIds)) {
      await conn.query('DELETE FROM permission_role WHERE role_id=?', [id]);
      if (permissionIds.length) await conn.query('INSERT INTO permission_role (permission_id, role_id) VALUES ?', [permissionIds.map((p: number) => [p, id])]);
    }
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  clearPermissionCache();
  return ok({ status: 'success', message: 'Role saved' });
});
export const DELETE = handler<Ctx>(async (_req, { params }, user) => {
  if (user.role !== ADMIN_ROLE) return fail(403, 'Only administrators can manage roles');
  if (Number(params.id) === ADMIN_ROLE) return fail(400, 'The Admin role cannot be removed');
  await exec("UPDATE roles SET status='0' WHERE id=?", [params.id]);
  return ok({ status: 'success', message: 'Role deactivated' });
});

export const dynamic = 'force-dynamic';
