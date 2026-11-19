import fs from 'node:fs/promises';
import path from 'node:path';
import { handler, ok, fail, moduleFor } from '@/lib/api';
import { createRecord, insertRow } from '@/lib/crud';
import { exec, one } from '@/lib/db';
import { toProfileRow, saveParsedData, logParse } from '@/lib/cv';
import { resolveStored, UPLOAD_ROOT } from '@/lib/storage';

/** Create (or update) a profile from a parsed CV after the recruiter has reviewed the fields. */
export const POST = handler(async (req, _ctx, user) => {
  const m = await moduleFor('profiles', user, 'add');
  const body = await req.json();
  const { data, file, overrides = {}, updateProfileId } = body || {};
  if (!data?.name && !overrides?.name) return fail(400, 'A candidate name is required.');
  let srcFile: string | null = null;
  if (file) { try { srcFile = resolveStored(String(file)); await fs.access(srcFile); } catch { srcFile = null; } }
  const row: any = { ...(await toProfileRow(data)), ...overrides, assignedUserID: overrides.assignedUserID ?? String(user.id), profile_added_by: String(user.id) };
  let pID: number;
  if (updateProfileId) {
    pID = Number(updateProfileId);
    const keys = Object.keys(row).filter((k) => row[k] !== '' && row[k] != null);
    await exec(`UPDATE profile SET ${keys.map((k) => `\`${k}\`=?`).join(',')} WHERE pID=?`, [...keys.map((k) => row[k]), pID]);
  } else {
    if (row.primaryEmail) {
      const dup = await one<{ pID: number }>('SELECT pID FROM profile WHERE primaryEmail=? AND deleted=0', [row.primaryEmail]);
      if (dup && !body.allowDuplicate) return fail(409, `A profile with this email already exists (P${dup.pID}).`);
    }
    pID = Number(await createRecord(m, user, row));
  }
  if (srcFile) {
    const src = srcFile;
    const destDir = path.join(UPLOAD_ROOT, 'candidate_resumes', String(pID));
    await fs.mkdir(destDir, { recursive: true });
    const name = path.basename(src);
    await fs.rename(src, path.join(destDir, name)).catch(async () => { await fs.copyFile(src, path.join(destDir, name)); });
    await exec('UPDATE profile SET resumeName=? WHERE pID=?', [`candidate_resumes/${pID}/${name}`, pID]);
    await exec('UPDATE cvprofile SET isDefault=0 WHERE pID=?', [pID]);
    await insertRow('cvprofile', { userID: user.id, pID, cvName: `candidate_resumes/${pID}/${name}`, uploadedDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'), isDefault: 1, status: 1, deleted: 0 });
  }
  await saveParsedData(pID, data);
  await logParse({ userId: user.id, fileName: path.basename(String(file || data.name)), fileType: 'profile', status: updateProfileId ? 'updated-profile' : 'created-profile', confidence: data.confidence?.overall, profileId: pID });
  return ok({ status: 'success', profileId: pID, message: updateProfileId ? 'Profile updated from CV' : 'Profile created' });
});

export const dynamic = 'force-dynamic';
