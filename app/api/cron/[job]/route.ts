import { JOBS } from '@/lib/cron';
import { getSession } from '@/lib/session';

/** Scheduled reminders. Call daily, e.g. `curl -H "x-cron-key: $CRON_SECRET" https://your-host/api/cron/all`.
 *  Administrators can also trigger a job from the browser while signed in (add ?force=1 to ignore the calendar). */
export async function GET(req: Request, { params }: { params: { job: string } }) {
  const url = new URL(req.url);
  const key = req.headers.get('x-cron-key') || url.searchParams.get('key');
  const user = await getSession();
  if (!((process.env.CRON_SECRET && key === process.env.CRON_SECRET) || user?.role === 1)) return Response.json({ message: 'Not allowed' }, { status: 403 });
  const job = JOBS[params.job];
  if (!job) return Response.json({ message: `Unknown job. Available: ${Object.keys(JOBS).join(', ')}` }, { status: 404 });
  try { return Response.json({ job: params.job, result: await job(url.searchParams.get('force') === '1') }); }
  catch (e: any) { return Response.json({ message: e.message }, { status: 500 }); }
}
export const dynamic = 'force-dynamic';
