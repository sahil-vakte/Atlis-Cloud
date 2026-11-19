import { handler, HttpError, moduleFor, ok } from '@/lib/api';
import { deleteRecord, getRecord, restoreRecord, updateRecord } from '@/lib/crud';

type Ctx = { params: { module: string; id: string } };
export const GET = handler<Ctx>(async (_req, { params }, user) => {
  const m = await moduleFor(params.module, user);
  const row = await getRecord(m, user, params.id);
  if (!row) throw new HttpError(404, `${m.singular} not found`);
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
