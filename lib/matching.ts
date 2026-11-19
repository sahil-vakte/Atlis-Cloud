import { query } from './db';
import { parseCV } from './cv/parse';
import { getDictionaries, skillNames, skillIdsFor } from './cv';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.]/g, '');
export function skillList(text: string | null | undefined, dictSkills: string[] = []) {
  if (!text) return [];
  // treat the text as a skills section so listed items are picked up too
  const p = parseCV(`Skills\n${text}`, '', { skills: dictSkills });
  return p.skills;
}

/** Rank profiles against a requirement using skills overlap, title similarity and location. */
export async function recommendProfiles(rID: number, limit = 25) {
  const r = (await query<any>('SELECT rID, roleName, skillset, jobDescription, location, city FROM requirement WHERE rID=?', [rID]))[0];
  if (!r) return [];
  const d = await getDictionaries();
  const reqSkills = await skillNames(r.skillset);
  const fromJd = r.jobDescription ? skillList(String(r.jobDescription).replace(/<[^>]+>/g, ' '), d.skills) : [];
  const want = [...new Set([...reqSkills, ...fromJd])].slice(0, 40);
  const wantSet = new Set(want.map(norm));
  const already = new Set((await query<any>('SELECT profileID FROM sourcing WHERE requirementID=? AND deleted=0', [String(rID)])).map((x) => String(x.profileID)));
  const allSkills = new Map((await query<{ id: number; n: string }>('SELECT skillID id, skillset n FROM master_skills')).map((x) => [String(x.id), x.n]));
  const cands = await query<any>(`SELECT p.pID, p.name, p.primaryEmail, p.currentLocation, p.city, p.skillset, d.designationName FROM profile p
    LEFT JOIN master_designation d ON d.designationID=p.designationID WHERE p.deleted=0 AND p.doNotCall=0 AND (p.skillset IS NOT NULL AND p.skillset<>'') LIMIT 5000`);
  const titleWords = new Set(String(r.roleName || '').toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  const out = cands.map((c) => {
    const have = String(c.skillset).split(/[,;|\n]/).map((s) => s.trim()).filter(Boolean).map((s) => (/^\d+$/.test(s) ? allSkills.get(s) || '' : s)).filter(Boolean);
    const matched = have.filter((s) => wantSet.has(norm(s)));
    const skillScore = wantSet.size ? matched.length / wantSet.size : 0;
    const t = String(c.designationName || '').toLowerCase().split(/\W+/).filter((w) => titleWords.has(w)).length;
    const loc = r.city && c.city && String(r.city).toLowerCase() === String(c.city).toLowerCase() ? 0.1 : 0;
    const score = Math.round(Math.min(1, skillScore * 0.8 + Math.min(t, 2) * 0.05 + loc) * 100);
    const { skillset, ...rest } = c;
    return { ...rest, skillCount: have.length, matched: [...new Set(matched)], score, alreadySourced: already.has(String(c.pID)) };
  }).filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  return { requirementSkills: want, profiles: out };
}

/** Turn a pasted job description into requirement fields. */
export async function parseJobDescription(text: string) {
  const d = await getDictionaries();
  const t = text.replace(/\r/g, '');
  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
  const label = (re: RegExp) => (t.match(re)?.[1] || '').trim();
  const roleName = label(/^(?:job title|role|position|title)\s*[:\-]\s*(.+)$/im) || lines.find((l) => l.length < 80 && !/:/.test(l)) || '';
  const location = label(/^(?:location|based in|work location)\s*[:\-]\s*(.+)$/im);
  const duration = label(/^(?:duration|contract length|length)\s*[:\-]\s*(.+)$/im) || (t.match(/\b(\d{1,2}\s*(?:months?|weeks?))\b/i)?.[1] ?? '');
  const rate = label(/^(?:rate|day rate|salary|budget|pay)\s*[:\-]\s*(.+)$/im) || (t.match(/([£$€₹]\s?\d[\d,]*(?:\s*-\s*[£$€₹]?\s?\d[\d,]*)?\s*(?:per|\/)\s*(?:day|hour|annum|year|month))/i)?.[1] ?? '');
  const jobType = /\bpermanent\b/i.test(t) && !/\bcontract\b/i.test(t) ? 'Permanent' : /\b(fixed[- ]term|ftc)\b/i.test(t) ? 'FTC' : /\bcontract(or)?\b/i.test(t) ? 'Contract' : '';
  const workMode = /\bhybrid\b/i.test(t) ? 'Hybrid' : /\bremote\b/i.test(t) ? 'Remote' : /\bon[- ]?site\b/i.test(t) ? 'Onsite' : '';
  const ir35 = /outside ir35/i.test(t) ? 'Outside IR35' : /inside ir35/i.test(t) ? 'Inside IR35' : '';
  const experience = t.match(/(\d{1,2}\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|yrs))/i)?.[1] || '';
  const openPositions = Number(t.match(/(\d{1,2})\s*(?:positions|openings|roles|vacancies)/i)?.[1] || 1);
  const skills = parseCV(t, '', { skills: d.skills }).skills.slice(0, 30);
  return { roleName, location, duration, rate, jobType, workMode, ir35, experience, openPositions, skills, skillset: await skillIdsFor(skills), jobDescription: t };
}
