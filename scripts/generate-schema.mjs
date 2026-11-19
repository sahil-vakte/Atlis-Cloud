// Introspects the connected MySQL/MariaDB database and writes lib/schema.json.
// Run after any DB schema change:  npm run schema
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  }
}
loadEnv();
const db = process.env.DB_NAME;
const conn = await mysql.createConnection({
  host: process.env.DB_HOST, port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: db,
});
const [cols] = await conn.query(
  `SELECT TABLE_NAME t, COLUMN_NAME c, DATA_TYPE dt, COLUMN_TYPE ct, IS_NULLABLE n, COLUMN_DEFAULT d, COLUMN_KEY k, EXTRA x, CHARACTER_MAXIMUM_LENGTH len
   FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME, ORDINAL_POSITION`, [db]);
const [counts] = await conn.query(`SELECT TABLE_NAME t, TABLE_ROWS r FROM information_schema.TABLES WHERE TABLE_SCHEMA=?`, [db]);
const tables = {};
for (const r of cols) {
  const t = (tables[r.t] ||= { name: r.t, pk: null, columns: [] });
  let enumValues;
  if (r.dt === 'enum') enumValues = r.ct.slice(5, -1).split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
  t.columns.push({
    name: r.c, type: r.dt, nullable: r.n === 'YES', default: r.d, length: r.len ?? undefined,
    autoIncrement: /auto_increment/.test(r.x), ...(enumValues ? { enumValues } : {}),
  });
  if (r.k === 'PRI' && !t.pk) t.pk = r.c;
}
for (const t of Object.values(tables)) {
  if (!t.pk) t.pk = t.columns.find((c) => c.name === 'id')?.name ?? t.columns[0].name;
  t.approxRows = +(counts.find((c) => c.t === t.name)?.r ?? 0);
}
fs.writeFileSync(path.join('lib', 'schema.json'), JSON.stringify(tables, null, 1));
console.log(`Wrote lib/schema.json — ${Object.keys(tables).length} tables`);
await conn.end();
