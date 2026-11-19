import assert from 'node:assert/strict';
import env from '@next/env';
env.loadEnvConfig(process.cwd());
const { pool } = await import('../lib/db');
const { reportDate } = await import('../lib/report-dates');
const { getTable } = await import('../lib/schema');
const field = getTable('candidate_data').columns.find(c=>c.name==='endDate')!;
const originalType = field.type;
try {
  for (const type of ['datetime','date','varchar']) {
    field.type = type;
    const sql = reportDate('candidate_data','endDate');
    const values = type==='varchar' ? [null,'','2026-11-19','19-11-2026','2026-11-19 12:30:00','2026-02-30','31-04-2026','2024-02-29','2025-02-29','garbage','2026-99-01'] : [null,'2026-11-19','2026-01-01'];
    const expected = type==='varchar' ? [null,null,'2026-11-19','2026-11-19','2026-11-19',null,null,'2024-02-29',null,null,null] : [null,'2026-11-19','2026-01-01'];
    for (let i=0;i<values.length;i++) {
      const source = type==='varchar' ? 'CAST(? AS CHAR)' : `CAST(? AS ${type.toUpperCase()})`;
      const [rows]: any = await pool.query(`SELECT DATE_FORMAT(${sql.value},'%Y-%m-%d') parsed, ${sql.empty} is_empty FROM (SELECT ${source} endDate) fixture`, [values[i]]);
      assert.equal(rows[0].parsed,expected[i],`${type}: ${values[i]}`);
      assert.equal(Number(rows[0].is_empty),values[i]===null||values[i]===''?1:0);
    }
  }
  console.log('Date regression checks passed: native date/datetime, blanks, mixed legacy formats, invalid dates and leap years.');
} finally { field.type=originalType; await pool.end(); }
