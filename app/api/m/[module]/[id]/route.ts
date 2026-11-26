import { one } from '@/lib/db';
import { INTERNAL, ORIGIN, RESOURCE, SCOPE } from '@/lib/mcp-auth';
import { handler, HttpError, moduleFor, ok } from '@/lib/api';
import { deleteRecord, getRecord, restoreRecord, updateRecord } from '@/lib/crud';

type Ctx = { params: { module: string; id: string } };
export const GET = handler<Ctx>(async (_req, { params }, user) => {
  const m = await moduleFor(params.module, user);
  const row = await getRecord(m, user, params.id);
  if (!row) throw new HttpError(404, `${m.singular} not found`);
  if (m.key === 'users' && user.role === 1 && !user.viewOnly) {
    const access = await one<{ enabled: number }>('SELECT enabled FROM atlis_mcp_access WHERE user_id=?', [row.id]);
    row.__mcp = {
      origin: ORIGIN, resource: RESOURCE, scope: SCOPE,
      enabled: Number(access?.enabled) === 1,
      eligible: INTERNAL.includes(Number(row.role_type)) && Number(row.status) === 1 && Number(row.isLogin) === 1 && !Number(row.deleted),
    };
  }
  return ok(row);
});
export const PUT = handler<Ctx>(async (req, { params }, user) => {
  const m = await moduleFor(params.module, user, 'edit');
  await updateRecord(m, user, params.id, await req.json());
  return ok({ status: 'success', message: `${m.singular} saved` });
});
export const DELETE = handler<Ctx>(async (_req, { params }, user) => {
  const m = await moduleFor(params.module, user, 'delete');
  await deleteRecord(m, user, params.id);
  return ok({ status: 'success', message: m.softDelete ? `${m.singular} archived` : `${m.singular} deleted` });
});
export const PATCH = handler<Ctx>(async (_req, { params }, user) => {
  const m = await moduleFor(params.module, user, 'restore');
  await restoreRecord(m, user, params.id);
  return ok({ status: 'success', message: `${m.singular} restored` });
});

export const dynamic = 'force-dynamic';
