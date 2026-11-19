import { handler, ok } from '@/lib/api';
import { listRecords } from '@/lib/crud';
import { getModule } from '@/lib/modules';
import { canAccess } from '@/lib/permissions';

/** Global search across the main modules the user can see. */
export const GET = handler(async (req, _c, user) => {
  const q = new URL(req.url).searchParams.get('q') || '';
  if (q.trim().length < 2) return ok({ groups: [] });
  const keys = ['profiles', 'requirements', 'submissions', 'consultants', 'clients', 'crm-prospects', 'knowledge-base', 'users'];
  const groups = [];
  for (const k of keys) {
    const m = getModule(k)!;
    if (!(await canAccess(user, m))) continue;
    const r = await listRecords(m, user, { q, pageSize: 5 });
    if (r.rows.length) groups.push({ module: k, label: m.label, items: r.rows.map((row: any) => ({ id: row[r.columns[0]], title: row[m.titleField] || `#${row[r.columns[0]]}`, sub: row.__labels?.client || row.primaryEmail || row.email || '' })) });
  }
  return ok({ groups });
});

export const dynamic = 'force-dynamic';
