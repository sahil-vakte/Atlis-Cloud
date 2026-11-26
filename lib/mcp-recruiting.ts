import { SignJWT, jwtVerify } from 'jose';
import type { PoolConnection } from 'mysql2/promise';
import { canAccess, canDo } from './permissions';
import { getModule } from './modules';
import { getRecord, listRecords } from './crud';
import { ORIGIN, sha, transaction } from './mcp-auth';
import type { SessionUser } from './session';

type User = SessionUser & { version: number };
type Candidate = { name: string; source_url: string; email?: string; location?: string; evidence?: string };
type Plan = { candidates?: Candidate[]; role?: number };
export class ToolError extends Error {}
const fail = (message: string): never => { throw new ToolError(message); };
const limited = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const roleId = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : fail('A numeric Atlis requirement ID is required.');

async function requireModule(user: User, name: string, action?: 'add' | 'edit') {
  const module = getModule(name)!;
  if (!(await canAccess(user, module)) || (action && !(await canDo(user, module, action)))) fail('Your Atlis permissions do not allow this action.');
  return module;
}

const entities: Record<string,string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
function plain(value: unknown, max = 14000) {
  return limited(value, max * 3).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6]|ul|ol)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '• ').replace(/<[^>]*>/g, '')
    .replace(/&([a-z]+|#39);/gi, (match, key) => entities[key.toLowerCase()] || match)
    .replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

export async function getRole(user: User, id: number) {
  const module = await requireModule(user, 'requirements');
  const row = await getRecord(module, user, String(id));
  if (!row || Number(row.deleted) || !Number(row.active)) throw new ToolError('This requirement is unavailable or inactive.');
  return {
    requirement_id: id, title: plain(row.roleName, 255), location: plain(row.location || [row.city, row.country].filter(Boolean).join(', '), 255),
    employment_type: row.__labels?.jobType || null, work_mode: row.__labels?.workMode || row.workMode || null,
    experience: plain(row.experience, 300), skills: row.__labels?.skillset || null,
    description: plain(row.jobDescription), summary: plain(row.summary, 1500),
    applications_open: Number(row.publish) === 1, internal_url: ORIGIN + '/m/requirements/' + id,
  };
}

const applicationUrl = (id: number) => ORIGIN + '/careers/' + id;
const previewSecret = () => {
  const key = process.env.JWT_SECRET;
  if (!key || key.length < 32) throw new Error('Review signing key is unavailable');
  return Buffer.from(sha('atlis-mcp-review-v1:' + key), 'hex');
};
async function preview(user: User, purpose: string, value: Plan) {
  return new SignJWT({ value, version: user.version }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id)).setAudience(purpose).setIssuer(ORIGIN).setIssuedAt().setExpirationTime('20m').sign(previewSecret());
}
async function confirmed(user: User, args: any, purpose: string) {
  if (args?.confirm !== true || typeof args?.review_token !== 'string' || args.review_token.length > 45000) {
    throw new ToolError('Ask the recruiter to review the preview, then provide its review token and explicit confirmation.');
  }
  try {
    const { payload } = await jwtVerify(args.review_token, previewSecret(), {
      issuer: ORIGIN, audience: purpose, subject: String(user.id), algorithms: ['HS256'],
    });
    if (payload.version !== user.version) throw new Error('Access changed');
    return payload.value as Plan;
  } catch { throw new ToolError('This review expired or belongs to a different Atlis user. Generate a new preview.'); }
}

function candidate(input: any): Candidate {
  const name = limited(input?.name, 255);
  if (!name || /^(null|n\/a)$/i.test(name)) fail('Each candidate must have a verified name.');
  let parsed: URL;
  try { parsed = new URL(limited(input?.source_url, 500)); } catch { throw new ToolError('Each candidate needs a valid public HTTPS source URL.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || !parsed.hostname.includes('.')) fail('Candidate source URLs must be public HTTPS links.');
  parsed.hash = '';
  const linkedIn = /(^|\.)linkedin\.com$/i.test(parsed.hostname);
  if (linkedIn) {
    if (!/^\/in\/[A-Za-z0-9_%.-]+\/?$/.test(parsed.pathname)) fail('Use a specific LinkedIn member profile URL.');
    parsed.hostname = 'www.linkedin.com';
    parsed.search = '';
  } else {
    for (const key of [...parsed.searchParams.keys()]) if (/^(utm_|gclid$|fbclid$)/i.test(key)) parsed.searchParams.delete(key);
    parsed.searchParams.sort();
  }
  const url = parsed.toString().replace(/\/(?=\?|$)/, '').replace(/\/$/, '');
  const email = limited(input?.email, 150).toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('Use a verified professional email or leave it blank.');
  return { name, source_url: url, email, location: limited(input?.location, 200), evidence: limited(input?.evidence, 1500) };
}

async function duplicate(db: Pick<PoolConnection, 'query'>, candidate: Candidate) {
  const url = candidate.source_url;
  const linkedin = url.startsWith('https://www.linkedin.com/in/');
  const variations = linkedin ? [
    url, url + '/', url.replace('www.', ''), url.replace('www.', '') + '/',
    url.replace('https://www.', 'http://www.'), url.replace('https://www.', 'http://www.') + '/',
  ] : [];
  const conditions = ['p.pID=(SELECT profile_id FROM atlis_mcp_sources WHERE source_hash=?)'];
  const args = [sha(url)];
  if (candidate.email) { conditions.push('p.primaryEmail=?'); args.push(candidate.email); }
  if (variations.length) { conditions.push('p.linkedin IN (' + variations.map(() => '?').join(',') + ')'); args.push(...variations); }
  const [rows] = await db.query('SELECT p.pID FROM profile p WHERE (' + conditions.join(' OR ') + ') ORDER BY p.deleted,p.pID LIMIT 1', args);
  return (rows as { pID: number }[])[0]?.pID ?? null;
}

async function prepareCandidates(user: User, args: any) {
  await requireModule(user, 'profiles', 'add');
  const role = await getRole(user, roleId(args.requirement_id));
  if (!Array.isArray(args.candidates) || !args.candidates.length || args.candidates.length > 10) fail('Preview between one and ten selected candidates.');
  const candidates: Candidate[] = args.candidates.map(candidate);
  const { pool } = await import('./db');
  const rows = [];
  for (const item of candidates) rows.push({ ...item, existing_profile_id: await duplicate(pool, item) });
  return { requirement_id: role.requirement_id, candidates: rows, review_token: await preview(user, 'profiles', { role: role.requirement_id, candidates }),
    next_step: 'Show the recruiter the proposed fields. Save only after they explicitly approve this exact set.' };
}

async function saveCandidates(user: User, args: any) {
  await requireModule(user, 'profiles', 'add');
  const plan = await confirmed(user, args, 'profiles');
  const role = await getRole(user, roleId(plan.role));
  return transaction(async (db) => {
      const results = [];
      for (const item of plan.candidates || []) {
        const existing = await duplicate(db, item);
        if (existing) {
          results.push({ name: item.name, status: 'existing', profile_id: existing, url: ORIGIN + '/m/profiles/' + existing });
          continue;
        }
        const notes = ('Public source: ' + item.source_url + '\nAtlis requirement: #' + role.requirement_id
          + (item.evidence ? '\nProfessional evidence: ' + item.evidence : ''));
        const [inserted] = await db.query(
          "INSERT INTO profile (name,primaryEmail,currentLocation,linkedin,AdditionalNotes,fulladdress,created_by_id,deleted) VALUES (?,?,?,?,?,'',?,0)",
          [item.name, item.email || null, item.location || null, item.source_url.includes('://www.linkedin.com/in/') ? item.source_url : null, notes, String(user.id)]);
        const profile = (inserted as { insertId: number }).insertId;
        await db.query('INSERT INTO atlis_mcp_sources (source_hash,source_url,profile_id,requirement_id,user_id) VALUES (?,?,?,?,?)',
          [sha(item.source_url), item.source_url, profile, role.requirement_id, user.id]);
        await db.query("INSERT INTO atlis_mcp_audit (user_id,action,record_id) VALUES (?,'profile_created',?)", [user.id, profile]);
        results.push({ name: item.name, status: 'created', profile_id: profile, url: ORIGIN + '/m/profiles/' + profile });
      }
      return results;

  }, 'atlis_mcp_profile_import');
}

async function hiringPack(user: User, id: number) {
  const role = await getRole(user, id);
  if (!role.title) fail('Add a role title in Atlis before preparing the hiring pack.');
  const apply = role.applications_open ? applicationUrl(id) : '[Atlis application link after activation]';
  const details = [
    role.location && 'Location: ' + role.location, role.employment_type && 'Employment type: ' + role.employment_type,
    role.work_mode && 'Working pattern: ' + role.work_mode, role.experience && 'Experience: ' + role.experience,
    role.skills && 'Key skills: ' + role.skills,
  ].filter(Boolean);
  return {
    role, application_url: role.applications_open ? apply : null,
    application_status: role.applications_open ? 'open' : 'draft',
    review_token: role.applications_open ? null : await preview(user, 'publication', { role: id }),
    missing_details: [
      !role.location && 'Location', !role.employment_type && 'Employment type',
      !role.description && 'Responsibilities and qualifications', 'Verify compensation disclosure requirements and approved wording',
    ].filter(Boolean),
    linkedin_job_draft: [role.title, details.join('\n'), role.description || role.summary,
      'Apply through Atlis Cloud and upload your CV: ' + apply].filter(Boolean).join('\n\n'),
    linkedin_feed_draft: ['We’re hiring: ' + role.title, [role.location, role.employment_type].filter(Boolean).join(' · '),
      role.skills ? 'Key skills: ' + role.skills : role.summary,
      'Apply and upload your CV: ' + apply].filter(Boolean).join('\n\n'),
    graphic_url: ORIGIN + '/api/mcp/graphic/' + id,
    graphic_format: 'Use the linked Atlis poster as the standard LinkedIn graphic. It uses role-related photography, verified role details, a no-logo and no-compensation layout, and an Apply now QR code when the role is open.',
    next_step: 'Review and polish the drafts using the supplied role data. Do not invent missing details. Ask before opening external applications. No LinkedIn content is posted.',
  };
}

async function publish(user: User, args: any) {
  await requireModule(user, 'requirements', 'edit');
  const plan = await confirmed(user, args, 'publication');
  const role = await getRole(user, roleId(plan.role));
  if (!role.title || !role.location || !role.description) fail('A title, location and job description are required before opening applications.');
  const changed = await transaction(async (db) => {
    const [result] = await db.query('UPDATE requirement SET publish=1 WHERE rID=? AND deleted=0 AND active=1 AND publish=0', [role.requirement_id]);
    if ((result as { affectedRows: number }).affectedRows) {
      await db.query("INSERT INTO atlis_mcp_audit (user_id,action,record_id) VALUES (?,'applications_opened',?)", [user.id, role.requirement_id]);
      return true;
    }
    return false;
  });
  const current = await getRole(user, role.requirement_id);
  if (!current.applications_open) fail('Applications could not be opened because this requirement changed.');
  return { requirement_id: current.requirement_id, changed, application_url: applicationUrl(current.requirement_id),
    graphic_url: ORIGIN + '/api/mcp/graphic/' + current.requirement_id, listed_on_atlis_careers: true };
}

export async function runTool(name: string, args: any, user: User) {
  switch (name) {
    case 'search_requirements': {
      const module = await requireModule(user, 'requirements');
      const results = await listRecords(module, user, { q: limited(args.query, 160), pageSize: 10, filters: { active: '1' } });
      return { total: results.total, requirements: results.rows.map((row: any) => ({
        requirement_id: row.rID, title: row.roleName, location: row.location, employment_type: row.__labels?.jobType || null,
      })) };
    }
    case 'read_requirement': return getRole(user, roleId(args.requirement_id));
    case 'preview_candidate_profiles': return prepareCandidates(user, args);
    case 'save_candidate_profiles': return saveCandidates(user, args);
    case 'prepare_hiring_pack': return hiringPack(user, roleId(args.requirement_id));
    case 'open_role_applications': return publish(user, args);
    default: throw new ToolError('Unknown Atlis tool.');
  }
}
