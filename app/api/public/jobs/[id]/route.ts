import { one } from '@/lib/db';
import { skillNames } from '@/lib/cv';
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const j = await one<any>(`SELECT r.rID id, r.roleName title, r.location, r.city, r.country, (SELECT GROUP_CONCAT(rt.requestType SEPARATOR ', ') FROM master_request_type rt WHERE FIND_IN_SET(rt.reqTypeID, r.jobType)) jobType, r.workMode, d.duration, r.skillset, r.summary, r.jobDescription, r.experience, t.name technology, r.created_at
    FROM requirement r LEFT JOIN master_technology t ON t.technologySubGroupID=r.technologyID LEFT JOIN master_duration d ON d.durationID=r.duration
    WHERE r.rID=? AND r.deleted=0 AND r.active=1 AND r.publish=1`, [params.id]);
  if (j) j.skillset = (await skillNames(j.skillset)).join(', ');
  return j ? Response.json(j) : Response.json({ message: 'Job not found' }, { status: 404 });
}

export const dynamic = 'force-dynamic';
