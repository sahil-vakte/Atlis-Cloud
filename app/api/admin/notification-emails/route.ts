import { handler, ok, fail } from '@/lib/api';
import { pool, query } from '@/lib/db';
import { clearSettingsCache, getSettings } from '@/lib/settings';
import { emailList, legacyEmail } from '@/lib/email-routing';
import { discoverNotificationRoutes } from '@/lib/notification-discovery';

export const GET = handler(async (_req, _ctx, user) => {
  if (user.role !== 1) return fail(403, 'Only administrators can view notification routing.');
  const settings = await getSettings();
  return ok({ routes: await query('SELECT * FROM app_email_routes ORDER BY original_email'),
    entities: await query("SELECT id,value,label FROM app_options WHERE group_key='entity_reminder_email' AND deleted=0 ORDER BY sort_order"),
    support_email: settings.support_email || '', reminder_email: settings.reminder_email || '',
    enabled: settings.email_delivery_enabled === '1', serverAllowed: process.env.EMAIL_DELIVERY_ENABLED === 'true', smtpConfigured: !!process.env.SMTP_HOST });
});
export const POST = handler(async (_req, _ctx, user) => {
  if (user.role !== 1 || user.viewOnly) return fail(403, 'Only administrators with edit access can discover recipients.');
  return ok({ discovered: await discoverNotificationRoutes() });
});
export const PUT = handler(async (req, _ctx, user) => {
  if (user.role !== 1 || user.viewOnly) return fail(403, 'Only administrators with edit access can change notification routing.');
  const body = await req.json();
  if (!Array.isArray(body.routes) || !Array.isArray(body.entities) || body.routes.length > 2000 || body.entities.length > 100) return fail(400, 'Invalid notification settings.');
  try {
    const validate = (v: unknown) => {
      if (typeof v !== 'string') throw new Error('Email destinations must be text.');
      const emails = emailList(v);
      if (emails.some(legacyEmail)) throw new Error('Use your own destination addresses, not a legacy company address.');
      return emails.join(',');
    };
    const support = validate(body.support_email), reminder = validate(body.reminder_email);
    const routes = body.routes.map((r: any) => {
      if (!Number.isInteger(r.id) || typeof r.enabled !== 'boolean') throw new Error('Invalid recipient row.');
      const replacement = validate(r.replacement_email);
      if (r.enabled && !replacement) throw new Error('Enabled replacements need a destination email.');
      return { ...r, replacement_email: replacement };
    });
    const entities = body.entities.map((e: any) => {
      if (!Number.isInteger(e.id)) throw new Error('Invalid entity row.');
      return { id: e.id, label: validate(e.label) };
    });
    if (typeof body.enabled !== 'boolean') throw new Error('Invalid delivery status.');
    if (body.enabled && (process.env.EMAIL_DELIVERY_ENABLED !== 'true' || !process.env.SMTP_HOST)) return fail(400, 'Server email delivery and SMTP must be configured first.');
    const db = await pool.getConnection();
    try {
      await db.beginTransaction();
      for (const r of routes) await db.query('UPDATE app_email_routes SET replacement_email=?, enabled=?, updated_by=? WHERE id=?', [r.replacement_email, r.enabled ? 1 : 0, user.id, r.id]);
      for (const e of entities) await db.query("UPDATE app_options SET label=? WHERE id=? AND group_key='entity_reminder_email'", [e.label, e.id]);
      for (const [k,v] of [['support_email',support],['reminder_email',reminder],['email_delivery_enabled',body.enabled ? '1' : '0']]) await db.query('INSERT INTO app_settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)', [k,v]);
      await db.commit();
    } catch (e) { await db.rollback(); throw e; } finally { db.release(); }
    clearSettingsCache();
    return ok({ message: 'Notification settings saved. No emails were sent.' });
  } catch (e: any) { return fail(400, e.message); }
});
export const dynamic = 'force-dynamic';
