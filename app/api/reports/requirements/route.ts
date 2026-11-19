import { handler, ok } from '@/lib/api';
import { requirementsReport, dateRange } from '@/lib/reports';
import { requireAny } from '@/lib/reportAccess';
export const GET = handler(async (req, _c, user) => { await requireAny(user, ['recruiter-report', 'requirements']); const u = new URL(req.url); if (!u.searchParams.get('days') && !u.searchParams.get('from')) u.searchParams.set('days', '365'); const { from, to } = dateRange(u); return ok({ from, to, ...(await requirementsReport(from, to)) }); });

export const dynamic = 'force-dynamic';
