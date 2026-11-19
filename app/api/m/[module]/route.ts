import { handler, listParams, moduleFor, ok } from '@/lib/api';
import { createRecord, listRecords } from '@/lib/crud';

type Ctx = { params: { module: string } };
export const GET = handler<Ctx>(async (req, { params }, user) => {
  const m = await moduleFor(params.module, user);
  return ok(await listRecords(m, user, listParams(new URL(req.url))));
});
export const POST = handler<Ctx>(async (req, { params }, user) => {
  const m = await moduleFor(params.module, user, 'add');
  const id = await createRecord(m, user, await req.json());
  return ok({ status: 'success', id, message: `${m.singular} created` });
});

export const dynamic = 'force-dynamic';
