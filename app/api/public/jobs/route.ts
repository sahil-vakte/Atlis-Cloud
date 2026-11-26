import { query } from '@/lib/db';
import { skillNames } from '@/lib/cv';
import { searchPattern, searchTerms } from '@/lib/search';
/** Public job board. Replaces the 12 hardcoded technology microsites (pega, workday, servicenow …) with one dynamic feed. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const tech = u.searchParams.get('technology'); const q = u.searchParams.get('q') || '';
  const where = ['r.deleted=0', 'r.active=1', 'r.publish=1']; const p: any[] = [];
  if (tech) { where.push('(t.slug=? OR t.name=?)'); p.push(tech, tech); }
  for (const term of searchTerms(q)) {
    const columns = ['r.roleName', 'r.skillset', 'r.location', 'r.city', 'r.country', 't.name'];
    where.push('(' + columns.map(c => `${c} LIKE ? ESCAPE '!'`).join(' OR ') + ')');
    p.push(...columns.map(() => searchPattern(term)));
  }
  const jobs = await query<any>(`SELECT r.rID id, r.roleName title, r.location, r.city, r.country, (SELECT GROUP_CONCAT(rt.requestType SEPARATOR ', ') FROM master_request_type rt WHERE FIND_IN_SET(rt.reqTypeID, r.jobType)) jobType, r.workMode, r.duration durationId, d.duration, r.skillset, r.summary, r.experience, t.name technology, t.slug technologySlug, r.created_at
    FROM requirement r LEFT JOIN master_technology t ON t.technologySubGroupID=r.technologyID LEFT JOIN master_duration d ON d.durationID=r.duration
    WHERE ${where.join(' AND ')} ORDER BY r.rID DESC LIMIT 200`, p);
  const technologies = await query<any>(`SELECT t.name, t.slug, COUNT(r.rID) jobs FROM master_technology t JOIN requirement r ON r.technologyID=t.technologySubGroupID AND r.deleted=0 AND r.active=1 AND r.publish=1
    WHERE t.deleted=0 GROUP BY t.technologySubGroupID ORDER BY jobs DESC`);
  for (const j of jobs) j.skillset = (await skillNames(j.skillset)).join(', ');
  return Response.json({ jobs, technologies });
}

export const dynamic = 'force-dynamic';
