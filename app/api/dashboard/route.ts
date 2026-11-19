import { handler, ok } from '@/lib/api';
import { dashboard } from '@/lib/reports';
export const GET = handler(async (_r, _c, user) => ok(await dashboard(user)));

export const dynamic = 'force-dynamic';
