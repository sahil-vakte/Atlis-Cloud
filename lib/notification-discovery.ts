import { exec, query } from './db';
import { legacyEmail } from './email-routing';

/** Read recipient fields only; never copy SMTP passwords or customer content. */
export async function discoverNotificationRoutes() {
  const sources: [string, string, string][] = [
    ['preferenceemail','invoiceIds','No-dues confirmation: To'],
    ['preferenceemail','ccEmail','No-dues confirmation: CC'],
    ['preferenceemail','bccEmail','No-dues confirmation: BCC'],
    ['users','email','User account: password reset'],
    ['profile','primaryEmail','Candidate: RTR/GDPR requests and selected email workflows'],
    ['candidate_data','candidateEmailID','Consultant: activation, timesheet reminders and no-dues requests'],
    ['contact','email','Contact: selected client submissions'],
    ['master_poc','primaryEmail','Client contact: selected client submissions'],
    ['email_settings','smtp_username','Legacy SMTP sender identity; configure your own SMTP account separately'],
  ];
  const found = new Map<string, Set<string>>();
  for (const [table, column, purpose] of sources) {
    const rows = await query<{ value: string }>(`SELECT DISTINCT \`${column}\` value FROM \`${table}\` WHERE \`${column}\` REGEXP 'testq|decillion|virgule|vurgule'`);
    for (const row of rows) for (const match of String(row.value).matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
      const email = match[0].toLowerCase();
      if (!legacyEmail(email)) continue;
      if (!found.has(email)) found.set(email, new Set());
      found.get(email)!.add(purpose);
    }
  }
  for (const [email, purposes] of found) await exec('INSERT IGNORE INTO app_email_routes (original_email,replacement_email,purpose) VALUES (?, ?, ?)', [email, '', [...purposes].join('; ')]);
  return found.size;
}
