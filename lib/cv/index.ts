import { exec, one, query } from '../db';
import { extractText } from './extract';
import { parseCV, type Dictionaries, type ParsedCV } from './parse';

let dictCache: { at: number; d: Dictionaries } | null = null;
export async function getDictionaries(): Promise<Dictionaries> {
  if (dictCache && Date.now() - dictCache.at < 10 * 60_000) return dictCache.d;
  const safe = async <T,>(sql: string) => { try { return await query<T>(sql); } catch { return [] as T[]; } };
  const skills = await safe<{ s: string }>("SELECT skillset s FROM master_skills WHERE IFNULL(deleted,0)=0 UNION SELECT skills FROM technology_skills WHERE IFNULL(deleted,0)=0 UNION SELECT name FROM master_technology WHERE IFNULL(deleted,0)=0");
  const des = await safe<{ d: string }>('SELECT designationName d FROM master_designation WHERE IFNULL(deleted,0)=0 UNION SELECT roleName FROM master_technology_role WHERE IFNULL(deleted,0)=0');
  const countries = await safe<{ n: string; c: string }>('SELECT countryName n, countryCode c FROM master_country WHERE IFNULL(deleted,0)=0 AND countryCode IS NOT NULL');
  const d: Dictionaries = {
    skills: skills.map((r) => r.s).filter(Boolean),
    designations: des.map((r) => r.d).filter(Boolean),
    countries: Object.fromEntries(countries.filter((c) => /^[A-Z]{2}$/.test(c.c || '')).map((c) => [c.n, c.c])),
  };
  dictCache = { at: Date.now(), d };
  return d;
}

export async function parseFile(fileName: string, buf: Buffer) {
  const t0 = Date.now();
  const ex = await extractText(fileName, buf);
  const data = parseCV(ex.text, fileName, await getDictionaries());
  data.warnings.unshift(...ex.warnings);
  return { data, method: ex.method, pages: ex.pages, durationMs: Date.now() - t0 };
}

export async function findDuplicates(p: ParsedCV) {
  const conds: string[] = []; const params: any[] = [];
  for (const e of p.emails.slice(0, 3)) { conds.push('primaryEmail=?'); params.push(e); }
  for (const ph of p.phones.slice(0, 2)) {
    const digits = ph.e164.replace(/\D/g, '').slice(-10);
    conds.push("REPLACE(REPLACE(REPLACE(REPLACE(primaryContact,' ',''),'-',''),'+',''),'(','') LIKE ?"); params.push(`%${digits}`);
  }
  if (!conds.length) return [];
  return query<{ pID: number; name: string; primaryEmail: string; primaryContact: string }>(
    `SELECT pID, name, primaryEmail, primaryContact FROM profile WHERE deleted=0 AND (${conds.join(' OR ')}) LIMIT 5`, params);
}

async function idByName(table: string, idCol: string, nameCol: string, value: string) {
  if (!value) return null;
  const r = await one<any>(`SELECT ${idCol} id FROM ${table} WHERE LOWER(${nameCol})=LOWER(?) AND IFNULL(deleted,0)=0 LIMIT 1`, [value.trim()]);
  return r?.id ?? null;
}

/** Legacy screens store skills as comma-separated master_skills IDs. Map names → IDs, adding new skills when needed. */
export async function skillIdsFor(names: string[]) {
  const ids: string[] = [];
  for (const raw of names.slice(0, 80)) {
    const n = raw.trim(); if (!n || n.length > 100) continue;
    let r = await one<{ id: number }>('SELECT skillID id FROM master_skills WHERE LOWER(skillset)=LOWER(?) AND IFNULL(deleted,0)=0 LIMIT 1', [n]);
    if (!r) { const ins = await exec('INSERT INTO master_skills (skillset, deleted, status) VALUES (?,0,1)', [n]); r = { id: ins.insertId }; dictCache = null; }
    if (!ids.includes(String(r.id))) ids.push(String(r.id));
  }
  return ids.join(',');
}
export async function skillNames(csv: string | null | undefined): Promise<string[]> {
  const parts = String(csv || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return [];
  const numeric = parts.filter((p) => /^\d+$/.test(p));
  const named = parts.filter((p) => !/^\d+$/.test(p));
  const rows = numeric.length ? await query<{ id: number; n: string }>(`SELECT skillID id, skillset n FROM master_skills WHERE skillID IN (${numeric.map(() => '?').join(',')})`, numeric) : [];
  const map = new Map(rows.map((r) => [String(r.id), r.n]));
  return [...numeric.map((x) => map.get(x)).filter(Boolean) as string[], ...named];
}

async function designationId(title: string) {
  const t = (title || '').trim();
  if (!t || t.length > 80) return null;
  const found = await idByName('master_designation', 'designationID', 'designationName', t);
  if (found) return found;
  const r = await exec('INSERT INTO master_designation (designationName, deleted, status) VALUES (?,0,1)', [t]);
  return r.insertId;
}

/** Map parsed data onto the legacy `profile` columns. */
export async function toProfileRow(p: ParsedCV) {
  const phone = p.phones[0];
  const edu = p.education.map((e) => [e.degree, e.field && `(${e.field})`, e.institution && `– ${e.institution}`, e.year].filter(Boolean).join(' ')).join('; ');
  return {
    name: p.name,
    primaryEmail: p.emails[0] || '',
    countryCode: phone?.callingCode || '',
    primaryContact: phone ? phone.national.replace(/^0/, '') : '',
    alternateContactNo: p.phones[1]?.e164 || '',
    currentLocation: p.location.formatted || p.location.city,
    city: p.location.city, country: p.location.country, zipcode: p.location.postcode,
    fulladdress: p.location.formatted || '',
    linkedin: p.linkedin,
    skillset: await skillIdsFor(p.skills),
    description: p.summary,
    educationBackground: edu.slice(0, 250),
    designationID: await designationId(p.designation),
    nationality: p.nationality ? await idByName('master_nationality', 'nationalityID', 'nationality', p.nationality) : null,
    gender: p.gender || null, dob: p.dob || null,
    cvContent: p.full_text.slice(0, 60000),
  };
}

export async function saveParsedData(profileID: number, p: ParsedCV) {
  const row = {
    profileID,
    education: JSON.stringify(p.education), languages: JSON.stringify(p.languages), profession: p.designation,
    skills: JSON.stringify(p.skills), summary: p.summary, totalYearsExperience: p.totalYearsExperience == null ? '' : String(p.totalYearsExperience),
    workExperience: JSON.stringify(p.workExperience), certifications: JSON.stringify(p.certifications), sections: JSON.stringify(p.sections),
  };
  const existing = await one<{ id: number }>('SELECT id FROM maskcvparcing WHERE profileID=? LIMIT 1', [profileID]);
  const keys = Object.keys(row) as (keyof typeof row)[];
  if (existing) await exec(`UPDATE maskcvparcing SET ${keys.map((k) => `\`${k}\`=?`).join(',')} WHERE id=?`, [...keys.map((k) => row[k]), existing.id]);
  else {
    const next = await one<{ n: number }>('SELECT IFNULL(MAX(id),0)+1 n FROM maskcvparcing');
    await exec(`INSERT INTO maskcvparcing (id, ${keys.map((k) => `\`${k}\``).join(',')}) VALUES (?, ${keys.map(() => '?').join(',')})`, [next!.n, ...keys.map((k) => row[k])]);
  }
}

export async function logParse(o: { userId?: number; fileName: string; fileType: string; status: string; confidence?: number; durationMs?: number; profileId?: number | null; warnings?: string[] }) {
  try {
    await exec('INSERT INTO cv_parse_log (user_id,file_name,file_type,status,confidence,duration_ms,profile_id,warnings) VALUES (?,?,?,?,?,?,?,?)',
      [o.userId ?? null, o.fileName.slice(0, 250), o.fileType, o.status, o.confidence ?? null, o.durationMs ?? null, o.profileId ?? null, (o.warnings || []).join(' | ').slice(0, 2000)]);
  } catch { /* ignore */ }
}
