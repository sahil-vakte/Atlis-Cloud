import { exec, one } from '@/lib/db';
import { insertRow } from '@/lib/crud';
import { parseFile, toProfileRow, saveParsedData, logParse } from '@/lib/cv';
import { saveUpload } from '@/lib/storage';

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now(); const arr = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  arr.push(now); hits.set(ip, arr); return arr.length > 10;
}
/** Candidate applies from the public job board. The CV is parsed in-house and a profile + sourcing record are created. */
export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local';
  if (limited(ip)) return Response.json({ message: 'Too many applications from this connection. Please try later.' }, { status: 429 });
  const f = await req.formData();
  const file = f.get('cv'); const jobId = String(f.get('jobId') || '');
  const name = String(f.get('name') || '').trim(); const email = String(f.get('email') || '').trim().toLowerCase(); const phone = String(f.get('phone') || '').trim();
  if (!(file instanceof File)) return Response.json({ message: 'Please attach your CV.' }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ message: 'Please enter a valid email address.' }, { status: 400 });
  if (f.get('consent') !== 'on' && f.get('consent') !== 'true') return Response.json({ message: 'Please accept the privacy notice.' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ message: 'CV must be under 10 MB.' }, { status: 400 });
  const job = jobId ? await one<any>('SELECT rID, client, regionID, teamID, assignUserID FROM requirement WHERE rID=? AND deleted=0 AND active=1 AND publish=1', [jobId]) : null;
  if (jobId && (!/^[1-9]\d{0,9}$/.test(jobId) || !job)) {
    return Response.json({ message: 'This role is no longer accepting applications.' }, { status: 404 });
  }
  const saved = await saveUpload('cv-pending/public', file);
  const { data } = await parseFile(file.name, saved.buffer);
  const row: any = await toProfileRow(data);
  row.name = name || row.name; row.primaryEmail = email; if (phone) row.primaryContact = phone;
  let p = await one<any>('SELECT pID FROM profile WHERE primaryEmail=? AND deleted=0', [email]);
  if (!p) {
    p = { pID: await insertRow('profile', { ...row, profileSource: 'Website', assignedUserID: job?.assignUserID?.split(',')[0] || null, isConsentApproved: 1, fulladdress: row.fulladdress || '', deleted: 0 }) };
  }
  const fs = await import('node:fs/promises'); const path = await import('node:path'); const { UPLOAD_ROOT } = await import('@/lib/storage');
  const dir = path.join(UPLOAD_ROOT, 'candidate_resumes', String(p.pID)); await fs.mkdir(dir, { recursive: true });
  await fs.rename(path.join(UPLOAD_ROOT, saved.relPath), path.join(dir, saved.fileName));
  await exec('UPDATE profile SET resumeName=? WHERE pID=?', [`candidate_resumes/${p.pID}/${saved.fileName}`, p.pID]);
  await insertRow('cvprofile', { userID: 0, pID: p.pID, cvName: `candidate_resumes/${p.pID}/${saved.fileName}`, uploadedDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'), isDefault: 1, status: 1, deleted: 0 }).catch(() => {});
  await saveParsedData(p.pID, data);
  if (job) {
    const exists = await one('SELECT sID FROM sourcing WHERE requirementID=? AND profileID=? AND deleted=0', [String(job.rID), String(p.pID)]);
    if (!exists) await insertRow('sourcing', { sourcingName: row.name, requirementID: String(job.rID), profileID: String(p.pID), assignedUserID: job.assignUserID?.split(',')[0] || null, regionID: job.regionID, teamID: job.teamID, clientID: job.client, deleted: 0, submitted: 0, active: 1, signatureImagebase64: '', sourcing_added_by: 'website', deleted_at: null });
  }
  await logParse({ fileName: file.name, fileType: 'public-apply', status: 'created-profile', confidence: data.confidence.overall, profileId: p.pID });
  return Response.json({ status: 'success', message: 'Thank you — your application has been received.' });
}

export const dynamic = 'force-dynamic';
