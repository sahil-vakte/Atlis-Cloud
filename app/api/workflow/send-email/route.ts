import { handler, ok, fail } from '@/lib/api';
import { exec, one } from '@/lib/db';
import { sendMail, renderBrandedEmail, fillTemplate } from '@/lib/mail';
import { getSettings } from '@/lib/settings';
import { grantedSet, ADMIN_ROLE } from '@/lib/permissions';

/** Send a stored email template (general or PS Care) to one or many recipients, with {{variable}} replacement. */
export const POST = handler(async (req, _c, user) => {
  if (user.role !== ADMIN_ROLE) { const g = await grantedSet(user); if (!['pscare_emails', 'email-templates', 'contract-closures'].some((p) => g.has(p))) return fail(403, 'Not allowed'); }
  const { kind = 'general', templateId, recipients = [], cc, bcc, subject, html, variables = {} } = await req.json();
  let tSubject = subject || '', tHtml = html || '';
  if (templateId) {
    const t = kind === 'pscare'
      ? await one<any>('SELECT subject s, description h FROM pscare_email_template WHERE templateID=?', [templateId])
      : await one<any>('SELECT email_template_subject s, email_template_html h FROM email_template WHERE email_template_id=?', [templateId]);
    if (!t) return fail(404, 'Template not found');
    tSubject ||= t.s; tHtml ||= t.h;
  }
  const list: { email: string; vars?: Record<string, any> }[] = recipients.map((r: any) => (typeof r === 'string' ? { email: r } : r)).filter((r: any) => r.email);
  if (!list.length) return fail(400, 'Add at least one recipient');
  const st = await getSettings();
  let sent = 0;
  for (const r of list) {
    const vars = { brand_name: st.brand_name, ...variables, ...(r.vars || {}) };
    const res = await sendMail({ to: r.email, cc, bcc, subject: fillTemplate(tSubject, vars), html: renderBrandedEmail(st, fillTemplate(tHtml, vars)) }).catch(() => ({ sent: false }));
    if (res.sent) sent++;
    await exec('INSERT INTO email_log (templateID, authUserID, emailTo, emailCC, emailBCC, subject, description, emailStatus, deleted) VALUES (?,?,?,?,?,?,?,?,0)',
      [templateId || null, user.id, r.email, cc || null, bcc || null, fillTemplate(tSubject, vars), fillTemplate(tHtml, vars), res.sent ? 1 : 0]).catch(() => {});
  }
  return ok({ status: 'success', message: sent === list.length ? `Sent ${sent} email(s)` : `Logged ${list.length} email(s); ${sent} delivered${sent < list.length ? ' — check SMTP settings' : ''}` });
});

export const dynamic = 'force-dynamic';
