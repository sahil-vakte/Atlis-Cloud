import { exec, ident, one, query } from './db';
import { getTable, hasColumn, col, SYSTEM_COLUMNS, type Table, type Column, isNumberType, isDateType } from './schema';
import { resolveLookup } from './lookups';
import type { ModuleDef } from './modules';
import type { SessionUser } from './session';
import { scheduleCrmSync } from './avrix-crm';

/** Saving these sends the prospect to the Avrix CRM hub (when AVRIX_CRM_* is configured). */
const CRM_TABLES = new Set(['prospects', 'prospects_contact']);

const NEVER_WRITABLE = new Set(['password', 'pass_word', 'emailKey', 'tokenLogin', 'otp', 'otpToken', 'candidatePassword']);

export function listColumnsFor(m: ModuleDef): string[] {
  const t = getTable(m.table);
  if (m.listColumns.length) return m.listColumns.filter((c) => hasColumn(t, c));
  const cols = [t.pk, m.titleField];
  for (const c of t.columns) {
    if (cols.length >= 7) break;
    if (cols.includes(c.name) || SYSTEM_COLUMNS.has(c.name) || ['deleted', 'is_deleted', 'assignedUserID'].includes(c.name)) continue;
    if (['text', 'mediumtext', 'longtext'].includes(c.type)) continue;
    cols.push(c.name);
  }
  if (hasColumn(t, 'status') && !cols.includes('status')) cols.push('status');
  return cols.filter((c) => hasColumn(t, c));
}

export function formColumnsFor(m: ModuleDef): Column[] {
  const t = getTable(m.table);
  const hidden = new Set([...(m.hidden || []), ...NEVER_WRITABLE, ...SYSTEM_COLUMNS]);
  if (m.softDelete) hidden.add(m.softDelete);
  return t.columns.filter((c) => !hidden.has(c.name) && !(c.name === t.pk && c.autoIncrement));
}

function scopeSql(m: ModuleDef, u: SessionUser) {
  const s = m.scope?.(u);
  return s ?? null;
}

export type ListParams = {
  page?: number; pageSize?: number; q?: string; sort?: string; dir?: 'asc' | 'desc';
  filters?: Record<string, string>; archived?: boolean; fk?: { column: string; value: string };
};

function buildWhere(m: ModuleDef, t: Table, u: SessionUser, p: ListParams) {
  const where: string[] = [];
  const params: any[] = [];
  if (m.baseWhere) where.push(`(${m.baseWhere})`);
  if (m.softDelete && hasColumn(t, m.softDelete)) where.push(`IFNULL(${ident(m.softDelete)},0)=${p.archived ? 1 : 0}`);
  const s = scopeSql(m, u);
  if (s) { where.push(`(${s.sql})`); params.push(...s.params); }
  if (p.fk && hasColumn(t, p.fk.column)) {
    where.push(`(${ident(p.fk.column)}=? OR FIND_IN_SET(?, ${ident(p.fk.column)}))`);
    params.push(p.fk.value, p.fk.value);
  }
  for (const [k, v] of Object.entries(p.filters || {})) {
    if (v === '' || v == null || !hasColumn(t, k)) continue;
    if (k.endsWith('__from') || k.endsWith('__to')) continue;
    if (m.multi?.includes(k)) { where.push(`FIND_IN_SET(?, REPLACE(${ident(k)},' ',''))`); params.push(v); }
    else { where.push(`${ident(k)}=?`); params.push(v); }
  }
  const dateCol = hasColumn(t, 'created_at') ? 'created_at' : null;
  if (dateCol && p.filters?.created_at__from) { where.push(`${ident(dateCol)}>=?`); params.push(p.filters.created_at__from); }
  if (dateCol && p.filters?.created_at__to) { where.push(`${ident(dateCol)}<=?`); params.push(p.filters.created_at__to + ' 23:59:59'); }
  if (p.q && p.q.trim()) {
    const terms = p.q.trim().split(/\s+/).slice(0, 6);
    const cols = [...new Set([...m.searchColumns, t.pk, m.titleField])].filter((c) => hasColumn(t, c));
    for (const term of terms) {
      where.push('(' + cols.map((c) => `${ident(c)} LIKE ?`).join(' OR ') + ')');
      cols.forEach(() => params.push(`%${term}%`));
    }
  }
  return { sql: where.length ? 'WHERE ' + where.join(' AND ') : '', params };
}

export async function listRecords(m: ModuleDef, u: SessionUser, p: ListParams) {
  const t = getTable(m.table);
  const page = Math.max(1, p.page || 1);
  const pageSize = Math.min(500, Math.max(5, p.pageSize || 25));
  const { sql, params } = buildWhere(m, t, u, p);
  let order = m.defaultSort || `${t.pk} DESC`;
  if (p.sort && hasColumn(t, p.sort)) order = `${ident(p.sort)} ${p.dir === 'asc' ? 'ASC' : 'DESC'}`;
  const cols = [...new Set([t.pk, m.titleField, ...listColumnsFor(m)])].filter((c) => hasColumn(t, c));
  const rows = await query(`SELECT ${cols.map(ident).join(',')} FROM ${ident(t.name)} ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
  const total = (await one<{ n: number }>(`SELECT COUNT(*) n FROM ${ident(t.name)} ${sql}`, params))?.n ?? 0;
  await attachLabels(m, rows);
  return { rows, total: Number(total), page, pageSize, columns: cols };
}

export async function exportRecords(m: ModuleDef, u: SessionUser, p: ListParams) {
  const t = getTable(m.table);
  const { sql, params } = buildWhere(m, t, u, p);
  const hidden = new Set([...(m.hidden || []), ...NEVER_WRITABLE]);
  const cols = t.columns.map((c) => c.name).filter((c) => !hidden.has(c));
  const rows = await query(`SELECT ${cols.map(ident).join(',')} FROM ${ident(t.name)} ${sql} ORDER BY ${m.defaultSort || t.pk + ' DESC'} LIMIT 50000`, params);
  await attachLabels(m, rows);
  return { rows, cols };
}

export async function getRecord(m: ModuleDef, u: SessionUser, id: string) {
  const t = getTable(m.table);
  const where = [`${ident(t.pk)}=?`];
  const params: any[] = [id];
  if (m.baseWhere) where.push(`(${m.baseWhere})`);
  const s = scopeSql(m, u);
  if (s) { where.push(`(${s.sql})`); params.push(...s.params); }
  const row = await one(`SELECT * FROM ${ident(t.name)} WHERE ${where.join(' AND ')}`, params);
  if (!row) return null;
  for (const k of NEVER_WRITABLE) delete (row as any)[k];
  await attachLabels(m, [row]);
  return row;
}

/** Resolve lookup ids → labels for display (handles comma-separated multi values). */
export async function attachLabels(m: ModuleDef, rows: any[]) {
  if (!rows.length || !m.lookups) return;
  for (const [column, key] of Object.entries(m.lookups)) {
    if (!(column in rows[0])) continue;
    const ids = new Set<string>();
    for (const r of rows) String(r[column] ?? '').split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => ids.add(x));
    if (!ids.size) continue;
    const l = resolveLookup(key);
    const list = [...ids].slice(0, 2000);
    const extra = key.startsWith('opt:') ? ` AND ${l.where}` : '';
    const res = await query<{ v: string; l: string }>(
      `SELECT ${ident(l.value)} v, ${l.label} l FROM ${ident(l.table)} WHERE ${ident(l.value)} IN (${list.map(() => '?').join(',')})${extra}`, list);
    const map = new Map(res.map((x) => [String(x.v), x.l]));
    for (const r of rows) {
      const raw = String(r[column] ?? '');
      if (!raw) continue;
      r.__labels ??= {};
      r.__labels[column] = raw.split(',').map((x) => x.trim()).filter((x) => x && x !== '0' && x.toUpperCase() !== 'NULL').map((x) => map.get(x) ?? x).join(', ');
    }
  }
}

function coerce(c: Column, v: any) {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) v = v.join(',');
  if (v === '' || v === null) {
    if (c.nullable) return null;
    if (isNumberType(c) || c.type === 'tinyint') return c.default != null ? Number(c.default) : 0;
    if (isDateType(c)) return c.default && !/current_timestamp/i.test(c.default) ? c.default : null;
    return c.default ?? '';
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
  if ((isNumberType(c) || c.type === 'tinyint') && v !== '' && !isNaN(Number(v))) return Number(v);
  if (c.type === 'date' && typeof v === 'string') return v.slice(0, 10);
  if ((c.type === 'datetime' || c.type === 'timestamp') && typeof v === 'string') return v.replace('T', ' ').slice(0, 19);
  return v;
}

function sanitize(m: ModuleDef, data: Record<string, any>, isCreate: boolean) {
  const t = getTable(m.table);
  const out: Record<string, any> = {};
  const allowed = new Set(formColumnsFor(m).map((c) => c.name));
  for (const c of t.columns) {
    if (!allowed.has(c.name)) continue;
    if (!(c.name in data)) continue;
    const v = coerce(c, data[c.name]);
    if (v !== undefined) out[c.name] = v;
  }
  if (isCreate) {
    // fill NOT NULL columns that have no default, so legacy strict schemas accept the insert
    for (const c of t.columns) {
      if (c.name in out || c.nullable || c.default != null || c.autoIncrement) continue;
      if (c.name === t.pk) continue;
      out[c.name] = isNumberType(c) || c.type === 'tinyint' ? 0 : isDateType(c) ? null : '';
      if (out[c.name] === null) delete out[c.name];
    }
  }
  return out;
}

async function nextPk(t: Table) {
  const r = await one<{ n: number }>(`SELECT IFNULL(MAX(${ident(t.pk)}),0)+1 n FROM ${ident(t.name)}`);
  return r?.n ?? 1;
}

export async function createRecord(m: ModuleDef, u: SessionUser, data: Record<string, any>) {
  const t = getTable(m.table);
  const own: Record<string, any> = {};
  if (m.scope?.(u) && m.ownerConsultantCol && !data[m.ownerConsultantCol] && (u.role === 16 || u.role === 3) && u.profileID) {
    const cd = await one<{ cdID: number }>('SELECT cdID FROM candidate_data WHERE profileID=? ORDER BY cdID DESC LIMIT 1', [u.profileID]);
    if (cd) own[m.ownerConsultantCol] = cd.cdID;
  }
  const row = { ...(m.defaults || {}), ...sanitize(m, { ...(m.defaults || {}), ...own, ...data }, true) };
  for (const k of Object.keys(row)) if (!hasColumn(t, k)) delete row[k];
  for (const k of ['created_by_id', 'userID', 'userId', 'user_id', 'authUserID']) {
    if (hasColumn(t, k) && (row[k] == null || row[k] === '') && !(k in (data || {}))) row[k] = String(u.id);
  }
  const pkCol = col(t, t.pk)!;
  if (!pkCol.autoIncrement && row[t.pk] == null) row[t.pk] = await nextPk(t);
  const keys = Object.keys(row);
  const res = await exec(`INSERT INTO ${ident(t.name)} (${keys.map(ident).join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map((k) => row[k]));
  const id = pkCol.autoIncrement ? res.insertId : row[t.pk];
  // portal users can only create records inside their own scope
  if (m.scope?.(u) && !(await getRecord(m, u, String(id)))) {
    await exec(`DELETE FROM ${ident(t.name)} WHERE ${ident(t.pk)}=?`, [id]);
    throw Object.assign(new Error('You can only add records for your own account'), { status: 403 });
  }
  await logActivity(u, m, id, 'created');
  if (CRM_TABLES.has(m.table)) scheduleCrmSync();
  return id;
}

export async function updateRecord(m: ModuleDef, u: SessionUser, id: string, data: Record<string, any>) {
  const t = getTable(m.table);
  if (!(await getRecord(m, u, id))) throw new Error('Record not found or access denied');
  const row = sanitize(m, data, false);
  delete row[t.pk];
  if (hasColumn(t, 'modified_by_id')) row.modified_by_id = String(u.id);
  const keys = Object.keys(row);
  if (!keys.length) return;
  await exec(`UPDATE ${ident(t.name)} SET ${keys.map((k) => `${ident(k)}=?`).join(',')} WHERE ${ident(t.pk)}=?`, [...keys.map((k) => row[k]), id]);
  await logActivity(u, m, id, `updated ${keys.slice(0, 8).join(', ')}${keys.length > 8 ? '…' : ''}`);
  if (CRM_TABLES.has(m.table)) scheduleCrmSync();
}

export async function deleteRecord(m: ModuleDef, u: SessionUser, id: string) {
  const t = getTable(m.table);
  if (!(await getRecord(m, u, id))) throw new Error('Record not found or access denied');
  if (m.softDelete && hasColumn(t, m.softDelete)) {
    const extra = hasColumn(t, 'deleted_at') ? ', deleted_at=NOW()' : '';
    await exec(`UPDATE ${ident(t.name)} SET ${ident(m.softDelete)}=1${extra} WHERE ${ident(t.pk)}=?`, [id]);
  } else {
    await exec(`DELETE FROM ${ident(t.name)} WHERE ${ident(t.pk)}=?`, [id]);
  }
  await logActivity(u, m, id, m.softDelete ? 'archived' : 'deleted');
}

export async function restoreRecord(m: ModuleDef, u: SessionUser, id: string) {
  const t = getTable(m.table);
  if (!m.softDelete) throw new Error('This module does not support restore');
  await exec(`UPDATE ${ident(t.name)} SET ${ident(m.softDelete)}=0 WHERE ${ident(t.pk)}=?`, [id]);
  await logActivity(u, m, id, 'restored');
}

export async function lookupOptions(key: string, q = '', limit = 50, ids?: string[]) {
  const l = resolveLookup(key);
  const params: any[] = [];
  const where: string[] = [];
  if (l.where) where.push(l.where);
  if (ids?.length) { where.push(`${ident(l.value)} IN (${ids.map(() => '?').join(',')})`); params.push(...ids); }
  else if (q) { where.push(`${l.label} LIKE ?`); params.push(`%${q}%`); }
  const sql = `SELECT ${ident(l.value)} value, ${l.label} label FROM ${ident(l.table)} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${l.order || 'label'} LIMIT ?`;
  params.push(limit);
  return query<{ value: string; label: string }>(sql, params);
}

export async function logActivity(u: SessionUser, m: ModuleDef, id: any, action: string) {
  try {
    await exec('INSERT INTO master_activity_log (userID, masterID, page, tab, action, status) VALUES (?,?,?,?,?,1)', [u.id, String(id), m.key, m.label, `${m.singular} #${id} ${action}`]);
  } catch { /* activity logging must never block the user */ }
}

/** Schema-aware insert for system writes (public forms, workflows): drops unknown columns and
 *  fills legacy NOT NULL columns that have no default, so inserts never fail on old strict schemas. */
export async function insertRow(table: string, data: Record<string, any>) {
  const t = getTable(table);
  const row: Record<string, any> = {};
  for (const c of t.columns) if (c.name in data && data[c.name] !== undefined) row[c.name] = data[c.name];
  for (const c of t.columns) {
    if (c.name in row || c.nullable || c.default != null || c.autoIncrement) continue;
    if (isDateType(c)) { row[c.name] = new Date().toISOString().slice(0, 19).replace('T', ' '); continue; }
    row[c.name] = isNumberType(c) || c.type === 'tinyint' ? 0 : c.type === 'enum' ? c.enumValues?.[0] ?? '' : '';
  }
  const pkCol = col(t, t.pk)!;
  if (!pkCol.autoIncrement && row[t.pk] == null) row[t.pk] = await nextPk(t);
  const keys = Object.keys(row);
  const res = await exec(`INSERT INTO ${ident(t.name)} (${keys.map(ident).join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map((k) => row[k]));
  return pkCol.autoIncrement ? res.insertId : row[t.pk];
}
