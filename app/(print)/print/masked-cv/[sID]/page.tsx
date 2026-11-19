import { notFound } from 'next/navigation';
import { one } from '@/lib/db';
import { getSession } from '@/lib/session';
import { getModule } from '@/lib/modules';
import { canAccess } from '@/lib/permissions';
import { getRecord } from '@/lib/crud';
import { getSettings } from '@/lib/settings';
import { skillNames } from '@/lib/cv';
import PrintButton from './PrintButton';

const scrub = (s: any) => String(s ?? '').replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email removed]').replace(/(\+?\d[\d\s().-]{8,}\d)/g, '[phone removed]').replace(/(https?:\/\/|www\.)\S+/g, '[link removed]');
const parse = (s: any) => { try { return JSON.parse(s || '[]'); } catch { return []; } };

export const metadata = { title: 'Masked CV' };
export default async function MaskedCv({ params }: { params: { sID: string } }) {
  const u = (await getSession())!;
  const m = getModule('sourcing')!;
  if (!(await canAccess(u, m)) || !(await getRecord(m, u, params.sID))) notFound();
  const s = await one<any>(`SELECT s.*, r.roleName, p.skillset profileSkills, p.description, p.pID FROM sourcing s LEFT JOIN requirement r ON r.rID=s.requirementID LEFT JOIN profile p ON p.pID=s.profileID WHERE s.sID=?`, [params.sID]);
  if (!s) notFound();
  const parsed = await one<any>('SELECT * FROM maskcvparcing WHERE profileID=? LIMIT 1', [s.profileID]);
  const st = await getSettings();
  const skills = (parsed ? parse(parsed.skills) : await skillNames(s.profileSkills)).slice(0, 40);
  const work = parsed ? parse(parsed.workExperience) : [];
  const edu = parsed ? parse(parsed.education) : [];
  const certs = parsed ? parse(parsed.certifications) : [];
  const rows: [string, any][] = [['Profile ID', s.profileID], ['Submission ID', s.generateSubmissionID || s.submissionID || `S${s.sID}`], ['Role', s.roleName], ['Lead time to start', s.noticePeriod || s.availability],
    ['Total experience (years)', s.totalExperience || parsed?.totalYearsExperience], ['Relevant experience (years)', s.relevantExperience], ['Current location', s.currentLocation]];
  return (
    <div className="mx-auto max-w-[800px] bg-white p-12 shadow-card print:max-w-none print:p-8 print:shadow-none">
      <PrintButton />
      <div className="flex items-center justify-between border-b-4 border-navy pb-4">
        <img src={st.brand_logo_light} alt={st.brand_name} className="h-8" />
        <span className="text-sm font-bold uppercase tracking-widest text-slate2">Candidate summary</span>
      </div>
      <table className="mt-6 w-full text-sm"><tbody>{rows.filter(([, v]) => v).map(([k, v]) => <tr key={k} className="border-b border-[#E6EBF4]"><td className="w-1/3 py-2 font-semibold text-slate2">{k}</td><td className="py-2">{scrub(v)}</td></tr>)}</tbody></table>
      {(s.profileSummary || parsed?.summary || s.description) && <section className="mt-6"><h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-navy">Profile summary</h2><p className="whitespace-pre-line text-sm leading-relaxed">{scrub(s.profileSummary || parsed?.summary || s.description)}</p></section>}
      {skills.length > 0 && <section className="mt-6"><h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-navy">Skills</h2><p className="text-sm">{skills.join(' · ')}</p></section>}
      {work.length > 0 && <section className="mt-6"><h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-navy">Experience</h2>
        {work.map((w: any, i: number) => <div key={i} className="mb-4 break-inside-avoid"><p className="text-sm font-bold">{w.title}{w.company ? ` — ${w.company}` : ''}</p><p className="text-xs text-slate2">{w.startDate} – {w.current ? 'Present' : w.endDate}</p>{w.description && <p className="mt-1 whitespace-pre-line text-sm">{scrub(w.description)}</p>}</div>)}</section>}
      {edu.length > 0 && <section className="mt-6"><h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-navy">Education</h2>{edu.map((e: any, i: number) => <p key={i} className="text-sm">{e.degree}{e.field && ` in ${e.field}`}{e.institution && `, ${e.institution}`}{e.year && ` (${e.year})`}</p>)}</section>}
      {certs.length > 0 && <section className="mt-6"><h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-navy">Certifications</h2><ul className="list-disc pl-5 text-sm">{certs.map((c: string) => <li key={c}>{c}</li>)}</ul></section>}
      <p className="mt-10 border-t border-[#E6EBF4] pt-3 text-[11px] text-slate2">Personal contact details have been removed. {st.brand_name}</p>
    </div>
  );
}
