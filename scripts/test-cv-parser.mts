// Runs the CV parser over a folder of CVs and scores it against expected.json.
// Usage: node --experimental-strip-types scripts/test-cv-parser.mts <folder> [expected.json]
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { extractText } from '../lib/cv/extract';
import { parseCV } from '../lib/cv/parse';

for (const f of ['.env.local', '.env']) if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
const dir = process.argv[2] || 'tests/cv-samples';
const expFile = process.argv[3] || path.join(dir, 'expected.json');
const expected = fs.existsSync(expFile) ? JSON.parse(fs.readFileSync(expFile, 'utf8')) : {};
let dict: any = {};
try {
  const c = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', port: +(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  const [s] = await c.query("SELECT skillset s FROM master_skills WHERE deleted=0 UNION SELECT skills FROM technology_skills WHERE deleted=0");
  const [d] = await c.query('SELECT designationName d FROM master_designation WHERE deleted=0');
  dict = { skills: (s as any[]).map((r) => r.s).filter(Boolean), designations: (d as any[]).map((r) => r.d) };
  await c.end();
} catch (e) { console.warn('DB dictionaries unavailable', (e as any).message); }

let pass = 0, total = 0;
const rows: string[] = [];
for (const f of fs.readdirSync(dir).sort().filter((x) => x !== 'expected.json')) {
  const buf = fs.readFileSync(path.join(dir, f));
  const t0 = Date.now();
  const ex = await extractText(f, buf);
  const p = parseCV(ex.text, f, dict);
  const ms = Date.now() - t0;
  const e = expected[f];
  const checks: [string, boolean, string][] = [];
  if (e) {
    const sk = new Set(p.skills.map((s) => s.toLowerCase()));
    checks.push(['name', p.name.toLowerCase() === e.name.toLowerCase(), p.name]);
    checks.push(['email', p.emails[0] === e.email, p.emails.join(' ')]);
    if (e.phone) checks.push(['phone', p.phoneNumbers.includes(e.phone), p.phoneNumbers.join(' ')]);
    if (e.city) checks.push(['city', p.location.city === e.city, p.location.city]);
    if (e.country) checks.push(['country', p.location.countryCode === e.country, p.location.countryCode]);
    if (e.skills) { const miss = e.skills.filter((s: string) => !sk.has(s.toLowerCase())); checks.push(['skills', miss.length === 0, miss.length ? 'missing ' + miss.join(', ') : `${p.skills.length} found`]); }
    if (e.years) checks.push(['years', p.totalYearsExperience != null && p.totalYearsExperience >= e.years[0] && p.totalYearsExperience <= e.years[1], String(p.totalYearsExperience)]);
    if (e.jobs) checks.push(['jobs', p.workExperience.length === e.jobs, String(p.workExperience.length)]);
    if (e.degree) checks.push(['degree', p.education.some((x) => x.degree === e.degree), p.education.map((x) => x.degree).join(',')]);
    if (e.title) checks.push(['title', p.designation.toLowerCase() === e.title.toLowerCase(), p.designation]);
    if (e.company) checks.push(['company', p.currentCompany.toLowerCase().includes(e.company.toLowerCase()), p.currentCompany]);
    if (e.languages) checks.push(['languages', e.languages.every((l: string) => p.languages.includes(l)), p.languages.join(',')]);
    if (e.nationality) checks.push(['nationality', p.nationality === e.nationality, p.nationality]);
    if (e.notice) checks.push(['notice', p.noticePeriod.includes(e.notice), p.noticePeriod]);
  }
  const ok = checks.filter((c) => c[1]).length;
  pass += ok; total += checks.length;
  rows.push(`\n${f}  [${ex.method}, ${ms}ms, confidence ${p.confidence.overall}]  ${ok}/${checks.length}`);
  for (const c of checks) if (!c[1] || process.env.VERBOSE) rows.push(`   ${c[1] ? '✓' : '✗'} ${c[0]}: ${c[2]}`);
  if (process.env.DUMP === f) console.log(ex.text, '\n----\n', JSON.stringify({ ...p, full_text: undefined, sections: undefined }, null, 1));
}
console.log(rows.join('\n'));
console.log(`\nTOTAL ${pass}/${total} checks passed (${Math.round((pass / Math.max(1, total)) * 100)}%)`);
