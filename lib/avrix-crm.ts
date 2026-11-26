import crypto from 'node:crypto';
import { exec, one, query } from './db';

/**
 * Avrix CRM hub connector: copies CRM prospects (company + key contact) into the shared CRM
 * (avrix-marketing → /api/intake/leads, application "atlis-crm"). One-way, read-only on this database
 * except for the sync cursor in app_settings. Recruitment candidates are never sent.
 * Run `GET /api/cron/crm-sync` every 15 minutes (same x-cron-key as the other jobs).
 * Env: AVRIX_CRM_URL, AVRIX_CRM_KEY, AVRIX_CRM_SECRET.
 */
const CURSOR = 'avrix_crm_sync_cursor';

export const crmEnabled = () => !!(process.env.AVRIX_CRM_URL && process.env.AVRIX_CRM_KEY && process.env.AVRIX_CRM_SECRET);

async function post(payload: unknown, idempotencyKey: string) {
  const body = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto.createHmac('sha256', process.env.AVRIX_CRM_SECRET!).update(`${ts}.${body}`).digest('hex');
  const res = await fetch(`${process.env.AVRIX_CRM_URL!.replace(/\/$/, '')}/api/intake/leads`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json', authorization: `Bearer ${process.env.AVRIX_CRM_KEY}`,
      'x-avrix-timestamp': ts, 'x-avrix-signature': `sha256=${sig}`, 'idempotency-key': idempotencyKey,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`CRM responded ${res.status}`);
}

async function setCursor(value: string) {
  const r = await exec('UPDATE app_settings SET setting_value=? WHERE setting_key=?', [value, CURSOR]);
  if (!r.affectedRows) await exec('INSERT INTO app_settings (setting_key, setting_value) VALUES (?,?)', [CURSOR, value]);
}

/** Prospect stage → CRM stage name ("atlis.cloud CRM" pipeline: New, Contacted, Qualified, Proposal sent, Won, Lost). */
function stageFor(p: any): string | undefined {
  const wl = String(p.winLost ?? '').toLowerCase();
  if (wl.startsWith('win') || wl.startsWith('won')) return 'Won';
  if (wl.startsWith('lost') || wl.startsWith('lose')) return 'Lost';
  const ps = String(p.progressStage ?? '').trim();
  return ps && isNaN(Number(ps)) ? ps : undefined; // a stage name the CRM knows is applied; anything else is ignored
}

export async function crmSync(force = false) {
  if (!crmEnabled()) return { skipped: 'AVRIX_CRM_URL / AVRIX_CRM_KEY / AVRIX_CRM_SECRET not set' };
  const started = (await one<{ n: string }>('SELECT NOW() n'))!.n;
  const since = force ? '1970-01-01 00:00:00' : (await one<{ v: string }>('SELECT setting_value v FROM app_settings WHERE setting_key=?', [CURSOR]))?.v ?? '1970-01-01 00:00:00';
  const rows = await query<any>(
    `SELECT p.* FROM prospects p WHERE p.deleted=0 AND (COALESCE(p.updated_at, p.created_at) > ?
       OR EXISTS (SELECT 1 FROM prospects_contact pc WHERE pc.prospectID=p.id AND pc.deleted=0 AND COALESCE(pc.updated_at, pc.created_at) > ?))
     ORDER BY p.id LIMIT 1000`, [since, since]);
  let sent = 0; const failed: number[] = [];
  for (const p of rows) {
    const contact = await one<any>(
      `SELECT * FROM prospects_contact WHERE prospectID=? AND deleted=0 ORDER BY (isKeyContact=1) DESC, (COALESCE(email, workEmail, '') <> '') DESC, prospectContactID LIMIT 1`, [p.id]);
    const email = (contact?.email || contact?.workEmail || p.email || '').trim().toLowerCase() || undefined;
    const phone = (contact?.phoneNo || contact?.workPhoneNo || '').trim() || undefined;
    if (!email && !phone) continue; // the CRM needs a way to contact someone
    const name = [contact?.firstName, contact?.lastName].filter(Boolean).join(' ').trim() || p.companyName;
    try {
      await post({
        externalId: String(p.id), name, email, phone, businessName: p.companyName || undefined,
        country: p.clientAddressCountry || undefined, stage: stageFor(p),
        priority: /high|hot|1/i.test(String(p.priority ?? '')) ? 'high' : 'normal',
        source: 'SYNC',
        message: p.accountSummary || p.agenda || undefined,
        customFields: {
          website: p.website || undefined, linkedIn: p.linkedInUrl || undefined, city: p.clientAddressCity || undefined,
          contactRole: contact?.designation || undefined, employeeCount: p.employeeCount || undefined, revenue: p.revenue || undefined,
          inPipeline: p.inPipeline ?? undefined, progressStage: p.progressStage ?? undefined, followUp: p.followUp || undefined,
          msaEndDate: p.msaCurrentEndDate || undefined,
        },
        tags: ['atlis-prospect'],
      }, `atlis-prospect-${p.id}-${String(p.updated_at ?? p.created_at ?? '')}`);
      sent++;
    } catch { failed.push(p.id); }
  }
  // Only move the cursor forward when everything went through, so failures are retried next run.
  if (!failed.length) await setCursor(started);
  return { since, checked: rows.length, sent, failed: failed.length };
}

/** Called after a prospect or prospect contact is saved: runs a sync a few seconds later (one at a time). */
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
export function scheduleCrmSync() {
  if (!crmEnabled() || timer) return;
  timer = setTimeout(async () => {
    timer = null;
    if (running) return scheduleCrmSync();
    running = true;
    try { await crmSync(); } catch (e: any) { console.error('[crm-sync]', e?.message); } finally { running = false; }
  }, 5_000);
}
