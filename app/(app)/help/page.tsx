import Link from 'next/link';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';
import { getSettings } from '@/lib/settings';
import { PageHeader } from '@/components/ui';

export const metadata = { title: 'Help' };
export default async function Help() {
  const u = await getSession(); const s = await getSettings();
  const articles = await query<any>(`SELECT a.id, a.name, c.name category FROM knowledge_base_article a LEFT JOIN knowledge_base_category c ON c.id=a.categoryID
    WHERE a.deleted=0 AND a.status=1 AND (c.roleType IS NULL OR c.roleType='' OR FIND_IN_SET(?, c.roleType)) ORDER BY c.name, a.order LIMIT 100`, [String(u?.role)]).catch(() => []);
  const topics = u && [3, 16, 17, 29].includes(u.role) ? [
    ['Submitting a timesheet', 'Go to Timesheets → New timesheet, choose the period, upload the signed timesheet and save. You will be emailed when it is approved or rejected.'],
    ['Submitting an invoice', 'Go to Invoices → New invoice. Enter the invoice number, period and amounts, attach the invoice PDF and save.'],
    ['Claiming expenses', 'Go to Expenses → New expense claim, then add one expense line for each receipt.'],
    ['Updating your details', 'Use Profile to update contact details and upload documents such as right-to-work evidence.'],
  ] : [
    ['Adding candidates from CVs', 'Open CV Parser, drop in one or many CVs, check the extracted details and click Create profile. Duplicates are flagged automatically.'],
    ['From requirement to placement', 'Create a requirement (paste the job description to fill it in), use Recommended profiles to shortlist, submit candidates from Sourcing, then Send to client from the submission.'],
    ['Approving timesheets and invoices', 'Open the record from PS Care → Timesheets or Invoices and choose Approve or Reject. Rejections ask for a reason.'],
    ['Changing dropdown values', 'Masters → Dropdown options holds the lists that used to be hardcoded (job types, entities, closure statuses …).'],
  ];
  return (
    <>
      <PageHeader title="Help" sub={`Guides for using ${s.brand_name}. Contact ${s.support_email} if you get stuck.`} />
      <div className="grid gap-4 md:grid-cols-2">{topics.map(([t, b]) => <div key={t} className="card p-5"><h3 className="font-bold text-navy">{t}</h3><p className="mt-1.5 text-sm text-slate2">{b}</p></div>)}</div>
      {articles.length > 0 && <><h2 className="mb-2 mt-8 text-xs font-bold uppercase tracking-widest text-slate2">Knowledge base</h2>
        <div className="card divide-y divide-[#EEF2F8]">{articles.map((a: any) => <Link key={a.id} href={`/m/knowledge-base/${a.id}`} className="flex justify-between px-5 py-3 text-sm hover:bg-[#F8FAFD]"><span className="font-semibold text-navy">{a.name}</span><span className="text-slate2">{a.category}</span></Link>)}</div></>}
    </>
  );
}
