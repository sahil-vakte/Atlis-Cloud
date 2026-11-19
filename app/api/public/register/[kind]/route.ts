import { insertRow } from '@/lib/crud';
import { sendMail, renderBrandedEmail } from '@/lib/mail';
import { getSettings } from '@/lib/settings';

const hits = new Map<string, number[]>();
/** Public client / vendor registration (replaces /client-registration and /vendor-registration). Records start inactive for review. */
export async function POST(req: Request, { params }: { params: { kind: string } }) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local';
  const now = Date.now(); const arr = (hits.get(ip) || []).filter((t) => now - t < 3600_000); arr.push(now); hits.set(ip, arr);
  if (arr.length > 5) return Response.json({ message: 'Too many submissions. Please try later.' }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const req_ = (k: string) => String(b[k] || '').trim();
  if (!req_('company') || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(req_('email'))) return Response.json({ message: 'Company name and a valid email are required.' }, { status: 400 });
  if (params.kind === 'client') {
    await insertRow('master_client', { clientName: req_('company'), email: req_('email'), primaryEmail: req_('email'), primaryContactName: req_('contactName'), primaryDesignation: req_('designation'), primaryContact: req_('phone'), website: req_('website'), clientAddressStreet: req_('address'), clientAddressCity: req_('city'), clientAddressCountry: req_('country'), clientAddressPostalCode: req_('postcode'), description: req_('notes'), howdidyoufindus: req_('source'), status: 0, deleted: 0 });
  } else if (params.kind === 'vendor') {
    await insertRow('master_vendor', { vendorRegID: `VEN${Date.now().toString(36).toUpperCase()}`, vendorName: req_('company'), vendorWebsite: req_('website'), pocNameOne: req_('contactName'), pocEmailOne: req_('email'), pocContactOne: req_('phone'), contactDesignation: req_('designation'), vendorLocation: req_('address'), vendorCity: req_('city'), vendorCountry: req_('country'), vendorPostalCode: req_('postcode'), vendorSkillsets: req_('skills'), howdidyoufindus: req_('source'), otherdetails: req_('notes'), status: 0, deleted: 0 });
  } else return Response.json({ message: 'Unknown registration type' }, { status: 404 });
  const s = await getSettings();
  await sendMail({ to: s.support_email, subject: `New ${params.kind} registration: ${req_('company')}`, html: renderBrandedEmail(s, `<p>A new ${params.kind} registered and is waiting for review.</p><p><b>${req_('company')}</b><br>${req_('contactName')} · ${req_('email')} · ${req_('phone')}</p>`) }).catch(() => {});
  return Response.json({ status: 'success', message: 'Thank you for registering. Our team will be in touch shortly.' });
}
export const dynamic = 'force-dynamic';
