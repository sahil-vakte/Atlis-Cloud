import { exec, one } from '@/lib/db';
import { insertRow } from '@/lib/crud';
import { sendMail, renderBrandedEmail } from '@/lib/mail';
import { getSettings } from '@/lib/settings';

type Ctx = { params: { kind: string; token: string } };
const bad = (m: string, s = 404) => Response.json({ message: m }, { status: s });

async function load(kind: string, token: string) {
  if (!/^[a-f0-9]{32,80}$/i.test(token)) return null;
  if (kind === 'rtr' || kind === 'gdpr') {
    return one<any>(`SELECT s.sID, s.isRTRreceived, s.isGDPRconfirm, p.pID, p.name, r.roleName, r.location, c.clientName, s.rateExpected, cur.currencyType
      FROM sourcing s LEFT JOIN profile p ON p.pID=s.profileID LEFT JOIN requirement r ON r.rID=s.requirementID LEFT JOIN master_client c ON c.clientID=s.clientID
      LEFT JOIN master_currency cur ON cur.currencyID=s.cCurrencyID WHERE s.token=? AND s.deleted=0`, [token]);
  }
  if (kind === 'invoice') {
    return one<any>(`SELECT c.cdID, COALESCE(NULLIF(c.candidateName,''), p.name) name, c.quarterKey, c.invoiceConsentLinkExpiry FROM candidate_data c LEFT JOIN profile p ON p.pID=c.profileID WHERE c.invoiceConsentToken=?`, [token]);
  }
  return null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const r = await load(params.kind, params.token);
  if (!r) return bad('This link is not valid. Please ask your recruiter for a new one.');
  if (params.kind === 'invoice' && r.invoiceConsentLinkExpiry && new Date(r.invoiceConsentLinkExpiry) < new Date()) return bad('This link has expired. Please ask for a new one.', 410);
  const done = params.kind === 'rtr' ? Number(r.isRTRreceived) === 1 : params.kind === 'gdpr' ? Number(r.isGDPRconfirm) === 1 : false;
  return Response.json({ ...r, done });
}

export async function POST(req: Request, { params }: Ctx) {
  const r = await load(params.kind, params.token);
  if (!r) return bad('This link is not valid.');
  const body = await req.json().catch(() => ({}));
  const signature = String(body.signature || '').trim();
  if (signature.length < 3 || !body.agree) return bad('Type your full name and tick the box to confirm.', 400);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || '';
  const s = await getSettings();
  if (params.kind === 'rtr') {
    await exec("UPDATE sourcing SET isRTRreceived=1, isRTR='1', conform_RTR='Yes', signatureCode=?, ipAddress=?, `currentTime`=?, rtrCandidateDetails=? WHERE sID=?",
      [signature, ip, new Date().toISOString(), JSON.stringify({ signature, ip, at: new Date().toISOString(), role: r.roleName, client: r.clientName }), r.sID]);
  } else if (params.kind === 'gdpr') {
    await exec('UPDATE sourcing SET isGDPRconfirm=1 WHERE sID=?', [r.sID]);
    if (r.pID) await exec("UPDATE profile SET isConsentApproved=1, consentStatus='1', gdprNotice=? WHERE pID=?", [`Consent given by ${signature} on ${new Date().toISOString()} from ${ip}`, r.pID]);
  } else if (params.kind === 'invoice') {
    if (r.invoiceConsentLinkExpiry && new Date(r.invoiceConsentLinkExpiry) < new Date()) return bad('This link has expired.', 410);
    await insertRow('candidate_invoice', { pID: r.cdID, invoiceMonth: r.quarterKey, invoiceMonthYear: `${r.quarterKey} ${new Date().getFullYear()}`, invoiceNo: `NODUE-${r.cdID}-${r.quarterKey}`, amount: 0, vatAmount: 0, grossAmount: 0, invoiceType: 'No Due Declaration', noDue: 1, verificationStatus: 'approved', adminRemark: `Confirmed by ${signature} from ${ip}`, deleted: 0, status: 1 });
    await exec('UPDATE candidate_data SET invoiceConsentToken=NULL WHERE cdID=?', [r.cdID]);
    const pref = await one<any>('SELECT invoiceIds, ccEmail, bccEmail FROM preferenceemail WHERE cdID=? LIMIT 1', [r.cdID]);
    if (pref?.invoiceIds) await sendMail({ to: pref.invoiceIds, cc: pref.ccEmail || undefined, bcc: pref.bccEmail || undefined, subject: `No-dues declaration – ${r.name} – ${r.quarterKey}`, html: renderBrandedEmail(s, `<p><b>${r.name}</b> has confirmed there are no outstanding invoices for ${r.quarterKey}.</p><p>Signed: ${signature}<br>IP: ${ip}<br>Time: ${new Date().toUTCString()}</p>`) }).catch(() => {});
  } else return bad('Unknown consent type');
  return Response.json({ status: 'success', message: 'Thank you — your confirmation has been recorded.' });
}
export const dynamic = 'force-dynamic';
