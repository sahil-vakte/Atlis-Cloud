import { handler, ok, fail, moduleFor, HttpError } from '@/lib/api';
import { exec, one, query } from '@/lib/db';
import { getRecord, logActivity, insertRow } from '@/lib/crud';
import { recommendProfiles } from '@/lib/matching';

type Ctx = { params: { id: string; action: string } };
export const GET = handler<Ctx>(async (_req, { params }, user) => {
  const m = await moduleFor('requirements', user);
  if (!(await getRecord(m, user, params.id))) throw new HttpError(404, 'Requirement not found');
  if (params.action === 'recommendations') return ok(await recommendProfiles(Number(params.id)));
  if (params.action === 'pipeline') {
    return ok(await query<any>(`SELECT s.sID, s.sourcingName, s.submitted, s.isSentToClient, s.profileID, p.name, ps.profileStatus, cs.callStatus, s.created_at
      FROM sourcing s LEFT JOIN profile p ON p.pID=s.profileID LEFT JOIN master_profile_status ps ON ps.pStatusID=s.pStatusID
      LEFT JOIN master_call_status cs ON cs.cStatusID=s.cStatusID WHERE s.requirementID=? AND s.deleted=0 ORDER BY s.sID DESC`, [params.id]));
  }
  return fail(404, 'Unknown action');
});
export const POST = handler<Ctx>(async (req, { params }, user) => {
  const body = await req.json().catch(() => ({}));
  if (params.action === 'add-profiles') {
    await moduleFor('sourcing', user, 'add');
    const r = await getRecord(await moduleFor('requirements', user), user, params.id);
    if (!r) throw new HttpError(404, 'Requirement not found');
    const ids: string[] = (body.profileIds || []).map(String);
    let added = 0;
    for (const pid of ids) {
      const exists = await one('SELECT sID FROM sourcing WHERE requirementID=? AND profileID=? AND deleted=0', [params.id, pid]);
      if (exists) continue;
      const p = await one<any>('SELECT name, currentLocation, nationality, workAuthID FROM profile WHERE pID=?', [pid]);
      if (!p) continue;
      await insertRow('sourcing', { sourcingName: p.name, requirementID: params.id, profileID: pid, assignedUserID: String(user.id), regionID: r.regionID, teamID: r.teamID, clientID: r.client, currentLocation: p.currentLocation, nationalityID: p.nationality, workAuthID: p.workAuthID, created_by_id: String(user.id), sourcing_added_by: String(user.id), deleted: 0, submitted: 0, active: 1, signatureImagebase64: '', deleted_at: null });
      added++;
    }
    await logActivity(user, await moduleFor('requirements', user), params.id, `${added} profile(s) added to sourcing`);
    return ok({ status: 'success', message: `${added} profile(s) added to sourcing`, added });
  }
  if (params.action === 'status') {
    await moduleFor('requirements', user, 'edit');
    await exec('UPDATE requirement SET active=?, reqStatusID=? WHERE rID=?', [body.active ? 1 : 0, body.reqStatusID || null, params.id]);
    return ok({ status: 'success', message: 'Requirement status updated' });
  }
  return fail(404, 'Unknown action');
});

export const dynamic = 'force-dynamic';
