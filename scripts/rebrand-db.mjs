// Replaces every "Tamis" / "TAMIS" / "tamis.cloud" in the database's text columns with "atlis.cloud".
//   npm run rebrand-db               → show what would change (dry run)
//   npm run rebrand-db -- --apply    → make the changes
//   add --include-candidate-content  → also rewrite candidates' own CV text (off by default)
import mysql from 'mysql2/promise';
import fs from 'node:fs';

for (const f of ['.env.local', '.env']) if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
const apply = process.argv.includes('--apply');
const includeCandidate = process.argv.includes('--include-candidate-content');
// never touch credentials or password hashes; candidate-authored CV text only on request
const SKIP = new Set(['email_settings.smtp_username', 'email_settings.smtp_password', 'users.password', 'users.pass_word', 'spothrm_users.password']);
const CANDIDATE = new Set(['profile.cvContent', 'maskcvparcing.sections', 'maskcvparcing.summary', 'maskcvparcing.workExperience', 'testqcv.permanentAddress']);
const db = process.env.DB_NAME;
const c = await mysql.createConnection({ host: process.env.DB_HOST, port: +(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: db });
const [cols] = await c.query(`SELECT TABLE_NAME t, COLUMN_NAME c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND DATA_TYPE IN ('varchar','char','text','tinytext','mediumtext','longtext')`, [db]);
let total = 0;
for (const { t, c: col } of cols) {
  const key = `${t}.${col}`;
  if (SKIP.has(key) || (!includeCandidate && CANDIDATE.has(key))) continue;
  const [[{ n }]] = await c.query(`SELECT COUNT(*) n FROM \`${t}\` WHERE \`${col}\` LIKE '%tamis%'`);
  if (!n) continue;
  total += n;
  console.log(`${apply ? 'updating' : 'would update'} ${String(n).padStart(4)} row(s) in ${key}`);
  if (apply) await c.query(`UPDATE \`${t}\` SET \`${col}\` = REGEXP_REPLACE(\`${col}\`, '(?i)tamis(\\\\.cloud)?', 'atlis.cloud') WHERE \`${col}\` LIKE '%tamis%'`);
}
console.log(`\n${total} row(s) ${apply ? 'updated' : 'would be updated'}.${apply ? '' : ' Run again with --apply to make the changes.'}`);
if (!includeCandidate) console.log('Candidate CV text was left unchanged (use --include-candidate-content to include it).');
console.log('SMTP credentials were left unchanged — update them in Administration → SMTP settings if the mailbox moves to atlis.cloud.');
await c.end();
