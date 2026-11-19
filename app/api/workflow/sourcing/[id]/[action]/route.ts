import fs from 'node:fs/promises';
import path from 'node:path';
import { handler, ok, fail, moduleFor, HttpError } from '@/lib/api';
import { exec, one, query } from '@/lib/db';
import { getRecord, logActivity } from '@/lib/crud';
import { sendMail, renderBrandedEmail } from '@/lib/mail';
import { getSettings } from '@/lib/settings';
import { UPLOAD_ROOT } from '@/lib/storage';

type Ctx = { params: { id: string; action: string } };
export const POST = handler<Ctx>(async (req, { params }, user) => {
  const body = await req.json().catch(() => ({}));
  const id = params.id;
  switch (params.action) {
    case 'submit': {
      const m = await moduleFor('sourcing', user, 'edit');
      const s = await getRecord(m, user, id);
      if (!s) throw new HttpError(404, 'Sourcing not found');
      if (Number(s.submitted) === 1) return ok({ status: 'success', message: 'Already submitted' });
      const now = new Date();
      const subId = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}S${id}`;
      await exec("UPDATE sourcing SET submitted=1, submitted_date=NOW(), generateSubmissionID=IFNULL(NULLIF(generateSubmissionID,''),?), submissionID=IFNULL(NULLIF(submissionID,''),?) WHERE sID=?", [subId, subId, id]);
      if (s.requirementID) await exec('UPDATE requirement SET subCount=IFNULL(subCount,0)+1 WHERE rID=?', [s.requirementID]);
      await logActivity(user, m, id, `submitted as ${subId}`);
      return ok({ status: 'success', message: `Submitted as ${subId}`, submissionId: subId });
    }
    case 'status': {
      const m = await moduleFor('submissions', user, 'edit');
      if (!(await getRecord(m, user, id)) && !(await getRecord(await moduleFor('sourcing', user), user, id))) throw new HttpError(404, 'Not found');
      const sets: string[] = []; const vals: any[] = [];
      for (const k of ['pStatusID', 'cStatusID', 'rejectionStage', 'interview1', 'interview2', 'interview3']) if (k in body) { sets.push(`${k}=?`); vals.push(body[k] === '' ? null : body[k]); }
      if (!sets.length && !body.comment) return fail(400, 'Nothing to update');
      if (sets.length) await exec(`UPDATE sourcing SET ${sets.join(',')}, profileStatusChangeDate=CURDATE() WHERE sID=?`, [...vals, id]);
      if (body.comment) await exec("INSERT INTO comments (submissionId,userId,commentType,comment,interviewDateTime,timeZone,status,deleted) VALUES (?,?,?,?,?,?,1,0)", [id, user.id, body.commentType || 'Update', body.comment, body.interviewDateTime || null, body.timeZone || null]);
      await logActivity(user, m, id, 'status updated');
      return ok({ status: 'success', message: 'Status updated' });
    }
    case 'send-to-client': {
      const m = await moduleFor('submissions', user, 'edit');
      const s = await getRecord(m, user, id);
      if (!s) throw new HttpError(404, 'Submission not found');
      const pocIds: string[] = (body.pocIds || []).map(String);
      const pocs = pocIds.length ? await query<any>(`SELECT pocID, primaryEmail, pocName FROM master_poc WHERE pocID IN (${pocIds.map(() => '?').join(',')})`, pocIds) : [];
      const to = [...pocs.map((p) => p.primaryEmail).filter(Boolean), ...String(body.to || '').split(/[,;]/).map((x: string) => x.trim()).filter(Boolean)];
      if (!to.length) return fail(400, 'Choose at least one recipient');
      const prof = await one<any>('SELECT name, resumeName FROM profile WHERE pID=?', [s.profileID]);
      const attachments: any[] = [];
      if (body.attachCv !== false && prof?.resumeName && String(prof.resumeName).includes('/')) {
        const file = path.join(UPLOAD_ROOT, prof.resumeName);
        try { await fs.access(file); attachments.push({ filename: path.basename(file), path: file }); } catch { /* CV not on disk */ }
      }
      const st = await getSettings();
      const result = await sendMail({ to: to.join(','), cc: body.cc, subject: body.subject || `Candidate submission: ${prof?.name || s.sourcingName}`, html: renderBrandedEmail(st, body.message || `<p>Please find the candidate profile for your review.</p>`), attachments });
      await exec("UPDATE sourcing SET isSentToClient='1', sentToClient_date=NOW() WHERE sID=?", [id]);
      await exec('INSERT INTO client_submission_logs (submissionID, clientID, fromID, toPocID, ccID) VALUES (?,?,?,?,?)', [id, s.clientID || null, user.id, pocIds.join(','), body.cc || null]);
      await logActivity(user, m, id, 'sent to client');
      return ok({ status: 'success', message: result.sent ? 'Sent to client' : 'Marked as sent (email not delivered — SMTP is not configured)' });
    }
    case 'request-rtr':
    case 'request-gdpr': {
      const m = await moduleFor('sourcing', user, 'edit');
      const s = await getRecord(m, user, id);
      if (!s) throw new HttpError(404, 'Sourcing not found');
      const prof = await one<any>('SELECT name, primaryEmail FROM profile WHERE pID=?', [s.profileID]);
      const to = body.to || prof?.primaryEmail;
      if (!to) return fail(400, 'The candidate has no email address');
      const crypto = await import('node:crypto');
      const token = s.token && /^[a-f0-9]{32,}$/i.test(s.token) ? s.token : crypto.randomBytes(24).toString('hex');
      const rtr = params.action === 'request-rtr';
      await exec(`UPDATE sourcing SET token=?, ${rtr ? 'isRtrSend=1' : 'isGDPRSent=1'} WHERE sID=?`, [token, id]);
      const st = await getSettings();
      const link = `${process.env.APP_URL || ''}/consent/${rtr ? 'rtr' : 'gdpr'}/${token}`;
      const req2 = await one<any>('SELECT r.roleName, c.clientName FROM requirement r LEFT JOIN master_client c ON c.clientID=r.client WHERE r.rID=?', [s.requirementID]);
      const res = await sendMail({ to, subject: rtr ? `Right to represent – ${req2?.roleName || 'your application'}` : `Your data and privacy – ${st.brand_name}`,
        html: renderBrandedEmail(st, rtr ? `<p>Hi ${prof?.name || ''},</p><p>Please confirm that we may represent you for the <b>${req2?.roleName || ''}</b> role${req2?.clientName ? ` with ${req2.clientName}` : ''}.</p><p><a class="btn" href="${link}">Review and confirm</a></p>`
          : `<p>Hi ${prof?.name || ''},</p><p>To keep working with you we need your consent to store and process your details in line with GDPR.</p><p><a class="btn" href="${link}">Review and give consent</a></p>`) });
      if (rtr) await exec('INSERT INTO rtr_email_logs (sourcingId, emailFrom, emailTo, added_date) VALUES (?,?,?,NOW())', [id, user.email, to]).catch(() => {});
      await logActivity(user, m, id, rtr ? 'RTR requested' : 'GDPR consent requested');
      return ok({ status: 'success', message: res.sent ? 'Request emailed to the candidate' : 'SMTP is not configured — copy the link for the candidate', link: res.sent ? undefined : link });
    }
    default: return fail(404, 'Unknown action');
  }
});

export const dynamic = 'force-dynamic';
