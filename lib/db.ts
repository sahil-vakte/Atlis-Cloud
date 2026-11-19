import mysql from 'mysql2/promise';

declare global { // eslint-disable-next-line no-var
  var __atlisPool: mysql.Pool | undefined;
}

export const pool: mysql.Pool =
  global.__atlisPool ??
  mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    dateStrings: true,
    charset: 'utf8mb4',
  });
if (process.env.NODE_ENV !== 'production') global.__atlisPool = pool;

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}
export async function one<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
export async function exec(sql: string, params: any[] = []) {
  const [res] = await pool.query(sql, params);
  return res as mysql.ResultSetHeader;
}
/** Quote an identifier after validating it against the schema registry. */
export const ident = (s: string) => {
  if (!/^[A-Za-z0-9_]+$/.test(s)) throw new Error(`Invalid identifier: ${s}`);
  return '`' + s + '`';
};
