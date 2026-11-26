import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
import { rebrandTemplateRow } from '../lib/template-branding';
nextEnv.loadEnvConfig(process.cwd());
const apply = process.argv.includes('--apply');
const backupArg = process.argv.find(a => a.startsWith('--backup='));
if (apply && !backupArg) throw new Error('An absolute --backup=path is required when applying changes.');
const backup = backupArg?.slice('--backup='.length);
if (backup && !path.isAbsolute(backup)) throw new Error('Backup path must be absolute.');
const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
try {
  await db.beginTransaction();
  const snapshots: Record<string, any[]> = {}, changes: { table: string; pk: string; id: any; fields: Record<string, any> }[] = [];
  for (const [table, pk] of [['email_template', 'email_template_id'], ['pscare_email_template', 'templateID']]) {
    const [rows] = await db.query<any[]>(`SELECT * FROM \`${table}\` FOR UPDATE`);
    snapshots[table] = rows;
    for (const row of rows) {
      const fields = rebrandTemplateRow(table, row);
      if (Object.keys(fields).length) changes.push({ table, pk, id: row[pk], fields });
    }
  }
  if (apply && changes.length) {
    fs.writeFileSync(backup!, JSON.stringify(snapshots, null, 2), { mode: 0o600, flag: 'wx' });
    for (const change of changes) {
      const fields = Object.keys(change.fields);
      await db.query(`UPDATE \`${change.table}\` SET ${fields.map(f => `\`${f}\`=?`).join(',')},updated_at=NOW() WHERE \`${change.pk}\`=?`, [...Object.values(change.fields), change.id]);
    }
    await db.commit();
  } else await db.rollback();
  console.log(JSON.stringify({ applied: apply, templatesChanged: changes.length, changes: changes.map(({ table, id, fields }) => ({ table, id, fields: Object.keys(fields) })) }, null, 2));
} catch (error) { await db.rollback(); throw error; } finally { await db.end(); }
