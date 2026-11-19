import assert from 'node:assert/strict';
import env from '@next/env';
import mysql from 'mysql2/promise';
import { SignJWT } from 'jose';
env.loadEnvConfig(process.cwd());
const db = await mysql.createConnection({ host:process.env.DB_HOST,port:+(process.env.DB_PORT || 3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME });
try {
  const [[admin]] = await db.query('SELECT id FROM users WHERE role_type=1 AND status=1 AND isLogin=1 AND deleted=0 LIMIT 1');
  assert.ok(admin,'An active administrator is required for the dashboard smoke check');
  const token = await new SignJWT({ u:{ id:admin.id,role:1,viewOnly:true } }).setProtectedHeader({alg:'HS256'}).setExpirationTime('2m').sign(new TextEncoder().encode(process.env.JWT_SECRET));
  const r = await fetch('http://127.0.0.1:3000/api/dashboard',{headers:{cookie:`atlis_session=${token}`},signal:AbortSignal.timeout(60000)});
  const data = await r.json();
  assert.equal(r.status,200,data.message || 'Dashboard API failed');
  assert.equal(data.kind,'internal');
  assert.equal(typeof data.kpis.activeConsultants,'number');
  assert.ok(Array.isArray(data.months));
  console.log('Dashboard API and KPI payload verified against the deployed database.');
} finally { await db.end(); }
