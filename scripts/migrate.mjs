// Applies database/001_atlis_cloud.sql to the database in .env.local (safe to run more than once).
import mysql from 'mysql2/promise';
import fs from 'node:fs';
for (const f of ['.env.local', '.env']) if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
const c = await mysql.createConnection({ host: process.env.DB_HOST, port: +(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, multipleStatements: true });
await c.query(fs.readFileSync('database/001_atlis_cloud.sql', 'utf8'));
console.log('Migration 001 applied.');
await c.end();
