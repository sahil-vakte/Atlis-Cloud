import nodemailer from 'nodemailer';
import { one, query } from './db';
import { getSettings, type Settings } from './settings';
import { emailList, legacyEmail, routeRecipients, routeEmailReferences, type EmailRoute } from './email-routing';
export { fillTemplate } from './template-content';

/** SMTP comes from .env, or from the `email_settings` table row of the given type (managed in Administration → SMTP settings). */
async function transport(settings: Settings, type?: string) {
  const configured = settings.notification_sender_email ?? ((process.env.SMTP_FROM || '').match(/<([^<>]+)>/)?.[1] || process.env.SMTP_FROM || '');
  const senders = emailList(configured);
  if (senders.length !== 1 || legacyEmail(senders[0])) return null;
  const from = { name: settings.notification_sender_name || settings.brand_name, address: senders[0] };
  if (type) {
    const row = await one<any>('SELECT * FROM email_settings WHERE type=? LIMIT 1', [type]);
    if (row?.smtp_host) return { t: nodemailer.createTransport({ host: row.smtp_host, port: 587, auth: { user: row.smtp_username, pass: row.smtp_password } }), from };
  }
  if (!process.env.SMTP_HOST) return null;
  return {
    t: nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined }),
    from,
  };
}
export async function sendMail(o: { to: string; cc?: string; bcc?: string; subject: string; html: string; smtpType?: string; attachments?: any[] }) {
  if (process.env.EMAIL_DELIVERY_ENABLED !== 'true') return { sent: false };
  const settings = await getSettings();
  if (settings.email_delivery_enabled !== '1') return { sent: false };
  const routes = await query<EmailRoute>('SELECT original_email,replacement_email,enabled FROM app_email_routes');
  const to = routeRecipients(o.to, routes), cc = routeRecipients(o.cc, routes), bcc = routeRecipients(o.bcc, routes);
  if (!to) return { sent: false };
  const tr = await transport(settings, o.smtpType);
  if (!tr) { console.warn('[mail] SMTP not configured — email not sent:', o.subject, '→', o.to); return { sent: false }; }
  await tr.t.sendMail({ from: tr.from, to, cc: cc || undefined, bcc: bcc || undefined, subject: routeEmailReferences(o.subject, routes), html: routeEmailReferences(o.html, routes, true), attachments: o.attachments });
  return { sent: true };
}
export function renderBrandedEmail(s: Settings, body: string) {
  const base = process.env.APP_URL || '';
  return `<!doctype html><html><body style="margin:0;background:#F3F6FB;font-family:Segoe UI,Arial,sans-serif;color:#0B1B3F">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#00297B;padding:20px 28px"><img src="${base}${s.brand_logo_dark}" alt="${s.brand_name}" height="28"></td></tr>
  <tr><td style="padding:28px;font-size:15px;line-height:1.6">${body.replace(/class="btn"/g, 'style="display:inline-block;background:#00297B;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600"')}</td></tr>
  <tr><td style="padding:16px 28px;font-size:12px;color:#576E9A;border-top:1px solid #E5EAF3">${s.brand_name} · ${s.support_email || ''}</td></tr>
  </table></td></tr></table></body></html>`;
}
