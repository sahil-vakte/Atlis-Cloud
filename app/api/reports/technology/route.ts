import { handler, ok } from '@/lib/api';
import { technologyReport } from '@/lib/reports';
import { requireAny } from '@/lib/reportAccess';
export const GET = handler(async (_req, _c, user) => { await requireAny(user, ['recruiter-report', 'technology-profiles-report']); return ok({ rows: await technologyReport() }); });

export const dynamic = 'force-dynamic';
