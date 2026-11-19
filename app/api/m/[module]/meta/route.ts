import { handler, moduleFor, ok } from '@/lib/api';
import { moduleMeta } from '@/lib/meta';
type Ctx = { params: { module: string } };
export const GET = handler<Ctx>(async (_req, { params }, user) => ok(await moduleMeta(await moduleFor(params.module, user), user)));

export const dynamic = 'force-dynamic';
