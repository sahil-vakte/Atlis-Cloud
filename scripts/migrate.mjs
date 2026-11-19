import mysql from 'mysql2/promise';
import fs from 'node:fs';
import crypto from 'node:crypto';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const db = await mysql.createConnection({ host:process.env.DB_HOST, port:+(process.env.DB_PORT || 3306), user:process.env.DB_USER, password:process.env.DB_PASSWORD, database:process.env.DB_NAME, multipleStatements:true });
try {
  await db.query('CREATE TABLE IF NOT EXISTS app_migrations (name VARCHAR(191) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
  for (const name of fs.readdirSync('database').filter(n=>/^\d+_.+\.sql$/.test(n)).sort()) {
    const sql = fs.readFileSync(`database/${name}`,'utf8');
    const checksum = crypto.createHash('sha256').update(sql.replace(/\r\n/g,'\n')).digest('hex');
    const [rows] = await db.query('SELECT checksum FROM app_migrations WHERE name=?',[name]);
    if (rows.length) { if(rows[0].checksum!==checksum) throw new Error(`Applied migration changed: ${name}`); continue; }
    await db.query(sql);
    await db.query('INSERT INTO app_migrations (name,checksum) VALUES (?,?)',[name,checksum]);
    console.log(`Applied ${name}`);
  }
} finally { await db.end(); }
