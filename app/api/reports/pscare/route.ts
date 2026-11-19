import { handler, ok } from '@/lib/api';
import { pscareReport, dateRange } from '@/lib/reports';
import { requireAny } from '@/lib/reportAccess';
export const GET = handler(async (req, _c, user) => { await requireAny(user, ['recruiter-report', 'contract-closures']); const { from, to } = dateRange(new URL(req.url)); return ok({ from, to, ...(await pscareReport(from, to)) }); });

export const dynamic = 'force-dynamic';
