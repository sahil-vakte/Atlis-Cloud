import { handler, ok } from '@/lib/api';
import { recruiterReport, dateRange } from '@/lib/reports';
import { requireAny } from '@/lib/reportAccess';
export const GET = handler(async (req, _c, user) => {
  await requireAny(user, ['recruiter-report', 'technology-profiles-report']);
  const url = new URL(req.url); const { from, to } = dateRange(url);
  return ok({ from, to, ...(await recruiterReport(from, to, url.searchParams.get('team') || undefined)) });
});

export const dynamic = 'force-dynamic';
