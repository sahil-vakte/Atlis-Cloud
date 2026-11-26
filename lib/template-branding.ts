/** Only for reusable communication templates, never historical records or customer data. */
export function rebrandTemplateText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]*(?:tamis|testq|decillion|v[ui]rgule)[A-Z0-9.-]*\.[A-Z]{2,}/gi, 'support@atlis.cloud')
    .replace(/https?:\/\/(?:www\.)?[^\s<>"']*(?:tamis|testq|decillion|v[ui]rgule)[^\s<>"']*/gi, 'https://atlis.cloud')
    .replace(/\b(?:tamis(?:\.cloud)?|testq(?:bv|tech)?(?:\s+technologies)?|decillion(?:\s+digital)?|v[ui]rgule(?:\s+international)?)(?:\s+(?:limited|ltd\.?|bv))?\b/gi, 'Atlis Cloud')
    .replace(/Atlis Cloud\s+(?:technologies)(?:\s+(?:limited|ltd\.?|bv))?/gi, 'Atlis Cloud')
    .replace(/Atlis Cloud\s+BV\b/gi, 'Atlis Cloud')
    .replace(/<li>\s*Address:\s*(?:49C The Parade[^<]*|Vlierweg 12[^<]*)<\/li>/gi, '<li>Billing address: use the details in your signed agreement.</li>')
    .replace(/<li>(?:&nbsp;|\s)*VAT\s*(?:number|no\.?)\s*:\s*(?:929658959|NL868391712B01)\s*<\/li>/gi, '<li>VAT details: use the details in your signed agreement, where applicable.</li>');
}

export const supportTemplate = '<p>Hello,</p><p>Welcome to Atlis Cloud.</p><p>For questions about onboarding, contracts, timesheets or invoices, contact our support team at <a href="mailto:support@atlis.cloud">support@atlis.cloud</a>.</p><p>Please include your name, the relevant contract or invoice reference, and a description of the issue. Our team will review your request and coordinate any further assistance.</p><p>Kind regards,<br>Atlis Cloud Support</p>';

export function rebrandTemplateRow(table: string, row: Record<string, any>) {
  const general = table === 'email_template';
  const fields = general ? ['email_template_name', 'email_template_subject', 'email_template_from', 'email_template_from_mail', 'email_template_html'] : ['templateName', 'subject', 'description'];
  const next: Record<string, any> = {};
  for (const field of fields) if (typeof row[field] === 'string') next[field] = rebrandTemplateText(row[field]);
  if (general) { next.email_template_from = 'Atlis Cloud'; next.email_template_from_mail = 'support@atlis.cloud'; }
  const name = general ? 'email_template_name' : 'templateName';
  const subject = general ? 'email_template_subject' : 'subject';
  const friendly: Record<string, [string, string]> = {
    sendRTR: ['Right to represent confirmation', 'Atlis Cloud | Right to represent confirmation'],
    sendPaidInvoiceMail: ['Invoice payment confirmation', 'Atlis Cloud | Invoice payment confirmation'],
    sendAcceptInvoiceMail: ['Invoice approval confirmation', 'Atlis Cloud | Invoice approved'],
  };
  if (general && friendly[row[name]]) { [next[name], next[subject]] = friendly[row[name]]; }
  if (/^Compliance Escalation Matrix$/i.test(row[name])) {
    next[name] = 'Atlis Cloud support and escalation'; next[subject] = 'How to contact Atlis Cloud support';
    next[general ? 'email_template_html' : 'description'] = supportTemplate;
  }
  return Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== row[key]));
}
