import { handler, ok, fail, moduleFor, HttpError } from '@/lib/api';
import { exec } from '@/lib/db';
import { getTable, hasColumn } from '@/lib/schema';
import { getRecord, logActivity } from '@/lib/crud';

const ALLOWED = new Set(['timesheets', 'invoices', 'expenses', 'expense-lines', 'client-invoices', 'candidate-documents', 'company-documents', 'sub-vendor-documents']);
type Ctx = { params: { module: string; id: string } };
export const POST = handler<Ctx>(async (req, { params }, user) => {
  if (!ALLOWED.has(params.module)) return fail(404, 'Verification is not available here');
  const m = await moduleFor(params.module, user, 'edit');
  if ([16, 17, 29, 3].includes(user.role)) throw new HttpError(403, 'Only staff can verify');
  const { status, remark } = await req.json();
  if (!['approved', 'rejected', 'pending'].includes(status)) return fail(400, 'Invalid status');
  if (!(await getRecord(m, user, params.id))) throw new HttpError(404, 'Not found');
  const t = getTable(m.table);
  const statusCol = hasColumn(t, 'verificationStatus') ? 'verificationStatus' : 'approvalStatus';
  const sets = [`${statusCol}=?`]; const vals: any[] = [status];
  if (hasColumn(t, 'verifiedByID')) { sets.push('verifiedByID=?'); vals.push(user.id); }
  if (hasColumn(t, 'approvedBy')) { sets.push('approvedBy=?'); vals.push(user.id); }
  if (hasColumn(t, 'adminRemark')) { sets.push('adminRemark=?'); vals.push(remark || null); }
  else if (hasColumn(t, 'remark')) { sets.push('remark=?'); vals.push(remark || null); }
  await exec(`UPDATE \`${t.name}\` SET ${sets.join(',')} WHERE \`${t.pk}\`=?`, [...vals, params.id]);
  await logActivity(user, m, params.id, status);
  return ok({ status: 'success', message: `Marked as ${status}` });
});

export const dynamic = 'force-dynamic';
