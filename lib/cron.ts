import crypto from 'node:crypto';
import { exec, one, query } from './db';
import { sendMail, renderBrandedEmail } from './mail';
import { getSettings } from './settings';

const daysList = (s: string | undefined, def: number[]) => (s ? s.split(',').map((x) => Number(x.trim())).filter((n) => !isNaN(n)) : def);
const toDate = (v: any) => { if (!v) return null; const s = String(v); const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/); const d = new Date(m ? `${m[3]}-${m[2]}-${m[1]}` : s.slice(0, 10)); return isNaN(d.getTime()) ? null : d; };
const daysUntil = (d: Date) => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);

/** Entity → reminder inbox. Configure in Masters → Dropdown options, group "entity_reminder_email" (value = entity, label = email). */
async function entityInbox(entity: string | null) {
  const s = await getSettings();
  if (entity) { const r = await one<any>("SELECT label FROM app_options WHERE group_key='entity_reminder_email' AND value=? AND deleted=0 AND status=1", [entity]); if (r?.label) return r.label; }
  if (entity) { const r = await one<any>('SELECT original_email FROM app_email_routes WHERE FIND_IN_SET(?,entity_keys) LIMIT 1', [entity]); if (r) return r.original_email; }
  return s.reminder_email || s.support_email;
}
async function alreadySent(cdID: any, type: string, subject: string) {
  return !!(await one('SELECT id FROM cronjob_email_log WHERE cdID=? AND type=? AND subject=? AND DATE(created_at)=CURDATE()', [cdID, type, subject]));
}
async function logSent(cdID: any, type: string, to: string, subject: string, entity: string | null, data: any) {
  await exec('INSERT INTO cronjob_email_log (cdID, type, toemail, subject, entity, jasonData, date) VALUES (?,?,?,?,?,?,CURDATE())', [cdID, type, to, subject, entity, JSON.stringify(data)]).catch(() => {});
}
const nameSql = "COALESCE(NULLIF(c.candidateName,''), p.name)";

export async function contractExpiry() {
  const s = await getSettings(); const days = daysList(s.contract_reminder_days, [45, 30, 15]); let sent = 0;
  const rows = await query<any>(`SELECT c.cdID, ${nameSql} name, c.endDate, c.role, c.endClient, so.entity FROM candidate_data c LEFT JOIN profile p ON p.pID=c.profileID
    LEFT JOIN sourcing so ON so.sID=c.sourcingID LEFT JOIN candidate_progress cp ON cp.cdID=c.cdID
    WHERE (cp.status='Joined' OR c.candidatureStatus='Joined') AND FIND_IN_SET('1', c.jobType)`);
  for (const r of rows) {
    const d = toDate(r.endDate); if (!d) continue; const left = daysUntil(d);
    if (!days.includes(left)) continue;
    const subject = `${s.brand_name} – ${r.name} contract expiry reminder: ${left} days remaining${r.entity ? ` – ${r.entity}` : ''}`;
    if (await alreadySent(r.cdID, 'contract', subject)) continue;
    const to = await entityInbox(r.entity);
    const delivery = await sendMail({ to, subject, html: renderBrandedEmail(s, `<p>The contract for <b>${r.name}</b> (${r.role || ''}${r.endClient ? ` at ${r.endClient}` : ''}) ends on <b>${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</b> — ${left} days from today.</p><p>Please confirm an extension or plan the off-boarding.</p>`) }).catch(() => ({ sent: false }));
    if (!delivery.sent) continue;
    await logSent(r.cdID, 'contract', to, subject, r.entity, { days: left }); sent++;
  }
  return { checked: rows.length, sent };
}

export async function poExpiry() {
  const s = await getSettings(); const days = daysList(s.po_reminder_days, [45, 30, 15]); let sent = 0;
  const rows = await query<any>(`SELECT po.id, po.cdID, po.po_no, po.po_end_date, ${nameSql} name, so.entity FROM po_details po JOIN candidate_data c ON c.cdID=po.cdID LEFT JOIN profile p ON p.pID=c.profileID LEFT JOIN sourcing so ON so.sID=c.sourcingID WHERE IFNULL(po.status,1)=1`);
  for (const r of rows) {
    const d = toDate(r.po_end_date); if (!d) continue; const left = daysUntil(d);
    if (!days.includes(left)) continue;
    const subject = `${s.brand_name} – PO ${r.po_no} for ${r.name} expires in ${left} days`;
    if (await alreadySent(r.cdID, 'po', subject)) continue;
    const to = await entityInbox(r.entity);
    const delivery = await sendMail({ to, subject, html: renderBrandedEmail(s, `<p>Purchase order <b>${r.po_no}</b> for <b>${r.name}</b> ends on <b>${d.toLocaleDateString('en-GB')}</b> (${left} days). Please request a new PO from the client.</p>`) }).catch(() => ({ sent: false }));
    if (!delivery.sent) continue;
    await logSent(r.cdID, 'po', to, subject, r.entity, { po: r.po_no, days: left }); sent++;
  }
  return { checked: rows.length, sent };
}

export async function timesheetReminder(force = false) {
  const s = await getSettings();
  const today = new Date().getDate();
  if (!force && !daysList(s.timesheet_reminder_days, [1, 3, 5]).includes(today)) return { skipped: `Not a reminder day (${s.timesheet_reminder_days || '1,3,5'})` };
  const prev = new Date(); prev.setDate(1); prev.setMonth(prev.getMonth() - 1);
  const ym = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const monthName = prev.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const rows = await query<any>(`SELECT c.cdID, ${nameSql} name, COALESCE(NULLIF(c.candidateEmailID,''), p.primaryEmail) email, so.entity FROM candidate_data c LEFT JOIN profile p ON p.pID=c.profileID
    LEFT JOIN sourcing so ON so.sID=c.sourcingID LEFT JOIN candidate_progress cp ON cp.cdID=c.cdID
    WHERE (cp.status='Joined' OR c.candidatureStatus='Joined') AND (c.timesheetReminder=1 OR c.istimesheetAccess=1)
      AND NOT EXISTS (SELECT 1 FROM candidate_timesheet t WHERE t.pID=c.cdID AND t.deleted=0 AND (DATE_FORMAT(t.fromDate,'%Y-%m')=? OR t.timesheetMonth LIKE ?))`, [ym, `%${monthName.split(' ')[0]}%`]);
  let sent = 0;
  for (const r of rows) {
    if (!r.email) continue;
    const subject = `Reminder: please submit your timesheet for ${monthName}`;
    if (await alreadySent(r.cdID, 'timesheet', subject)) continue;
    const delivery = await sendMail({ to: r.email, subject, html: renderBrandedEmail(s, `<p>Hi ${r.name || ''},</p><p>We haven't received your timesheet for <b>${monthName}</b> yet. Please sign in and upload it so your invoice can be processed on time.</p><p><a class="btn" href="${process.env.APP_URL || ''}/m/timesheets/new">Submit timesheet</a></p>`) }).catch(() => ({ sent: false }));
    if (!delivery.sent) continue;
    await logSent(r.cdID, 'timesheet', r.email, subject, r.entity, { month: ym }); sent++;
  }
  return { due: rows.length, sent };
}

export async function noDueConsent(force = false) {
  const s = await getSettings(); const now = new Date();
  if (!force && !(now.getDate() === 1 && [0, 3, 6, 9].includes(now.getMonth()))) return { skipped: 'Runs on the first day of each quarter' };
  const q = Math.floor(now.getMonth() / 3); const quarterKey = q === 0 ? 'Q4' : `Q${q}`;
  const rows = await query<any>(`SELECT c.cdID, ${nameSql} name, COALESCE(NULLIF(c.candidateEmailID,''), p.primaryEmail) email FROM candidate_data c LEFT JOIN profile p ON p.pID=c.profileID
    LEFT JOIN candidate_progress cp ON cp.cdID=c.cdID WHERE cp.status IN ('Joined','Contract End') AND EXISTS (SELECT 1 FROM candidate_invoice i WHERE i.pID=c.cdID AND i.verificationStatus='paid')`);
  let sent = 0;
  for (const r of rows) {
    if (!r.email) continue;
    const token = crypto.randomBytes(24).toString('hex');
    await exec('UPDATE candidate_data SET invoiceConsentToken=?, invoiceConsentLinkExpiry=?, quarterKey=? WHERE cdID=?', [token, new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), quarterKey, r.cdID]);
    const subject = `${s.brand_name}: please confirm there are no outstanding invoices for ${quarterKey}`;
    const delivery = await sendMail({ to: r.email, subject, html: renderBrandedEmail(s, `<p>Hi ${r.name || ''},</p><p>Please confirm that all your invoices for ${quarterKey} have been paid and nothing is outstanding.</p><p><a class="btn" href="${process.env.APP_URL || ''}/consent/invoice/${token}">Review and confirm</a></p><p>The link is valid for 14 days.</p>`) }).catch(() => ({ sent: false }));
    if (!delivery.sent) continue;
    await logSent(r.cdID, 'no-due', r.email, subject, null, { quarterKey }); sent++;
  }
  return { sent, quarterKey };
}

export async function documentExpiry() {
  const s = await getSettings(); const days = daysList(s.document_reminder_days, [30, 7]); let sent = 0;
  const rows = await query<any>(`SELECT d.documentID, d.pID cdID, d.documentTitle, d.validityofRTW, ${nameSql} name, so.entity FROM candidate_documents d JOIN candidate_data c ON c.cdID=d.pID
    LEFT JOIN profile p ON p.pID=c.profileID LEFT JOIN sourcing so ON so.sID=c.sourcingID WHERE d.validityofRTW IS NOT NULL AND d.validityofRTW<>''`);
  for (const r of rows) {
    const d = toDate(r.validityofRTW); if (!d) continue; const left = daysUntil(d);
    if (!days.includes(left)) continue;
    const subject = `${s.brand_name} – right-to-work document for ${r.name} expires in ${left} days`;
    if (await alreadySent(r.cdID, 'document', subject)) continue;
    const to = await entityInbox(r.entity);
    const delivery = await sendMail({ to, subject, html: renderBrandedEmail(s, `<p>The document <b>${r.documentTitle}</b> for <b>${r.name}</b> expires on <b>${d.toLocaleDateString('en-GB')}</b>. Please request updated evidence.</p>`) }).catch(() => ({ sent: false }));
    if (!delivery.sent) continue;
    await logSent(r.cdID, 'document', to, subject, r.entity, { days: left }); sent++;
  }
  return { checked: rows.length, sent };
}

export const JOBS: Record<string, (force?: boolean) => Promise<any>> = {
  'contract-expiry': contractExpiry, 'po-expiry': poExpiry, 'timesheet-reminder': timesheetReminder, 'no-due-consent': noDueConsent, 'document-expiry': documentExpiry,
  all: async () => ({ contract: await contractExpiry(), po: await poExpiry(), timesheet: await timesheetReminder(), noDue: await noDueConsent(), documents: await documentExpiry() }),
};
