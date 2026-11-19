import ExcelJS from 'exceljs';
import { handler, ok, fail, moduleFor } from '@/lib/api';
import { createRecord, formColumnsFor } from '@/lib/crud';
import { humanize } from '@/lib/schema';
import { resolveLookup } from '@/lib/lookups';
import { query, ident } from '@/lib/db';

/** Bulk import from .xlsx or .csv. Headers can be field names or their labels; dropdown columns accept the visible text. */
type Ctx = { params: { module: string } };
export const POST = handler<Ctx>(async (req, { params }, user) => {
  const m = await moduleFor(params.module, user, 'add');
  const file = (await req.formData()).get('file');
  if (!(file instanceof File)) return fail(400, 'Choose a spreadsheet');
  const buf = Buffer.from(await file.arrayBuffer());
  let rows: string[][] = [];
  if (/\.csv$/i.test(file.name)) {
    const text = buf.toString('utf8').replace(/^﻿/, '');
    rows = text.split(/\r?\n/).filter((l) => l.trim()).map((l) => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')));
  } else {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf as any);
    const ws = wb.worksheets[0];
    ws.eachRow((r) => rows.push((r.values as any[]).slice(1).map((v) => (v && typeof v === 'object' ? v.text ?? v.result ?? (v instanceof Date ? v.toISOString().slice(0, 10) : '') : v ?? '').toString())));
  }
  if (rows.length < 2) return fail(400, 'The sheet needs a header row and at least one data row');
  const cols = formColumnsFor(m);
  const byKey = new Map<string, string>();
  for (const c of cols) { byKey.set(c.name.toLowerCase(), c.name); byKey.set(humanize(c.name).toLowerCase(), c.name); }
  const header = rows[0].map((h) => byKey.get(String(h).trim().toLowerCase()) || null);
  if (!header.some(Boolean)) return fail(400, `None of the column headings match ${m.label} fields`);
  const lookupCache = new Map<string, Map<string, string>>();
  const toId = async (col: string, text: string) => {
    const key = m.lookups?.[col]; if (!key || !text) return text;
    if (!lookupCache.has(key)) { const l = resolveLookup(key); const r = await query<any>(`SELECT ${ident(l.value)} v, ${l.label} l FROM ${ident(l.table)}${l.where ? ` WHERE ${l.where}` : ''}`); lookupCache.set(key, new Map(r.map((x) => [String(x.l).toLowerCase(), String(x.v)]))); }
    const map = lookupCache.get(key)!;
    return text.split(/\s*[,;]\s*/).map((p) => map.get(p.toLowerCase()) ?? p).join(',');
  };
  let created = 0; const errors: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const data: Record<string, any> = {};
    for (let j = 0; j < header.length; j++) if (header[j] && rows[i][j] !== undefined && String(rows[i][j]).trim() !== '') data[header[j]!] = await toId(header[j]!, String(rows[i][j]).trim());
    if (!Object.keys(data).length) continue;
    try { await createRecord(m, user, data); created++; } catch (e: any) { errors.push(`Row ${i + 1}: ${e.sqlMessage || e.message}`); }
  }
  return ok({ status: errors.length ? 'partial' : 'success', message: `Imported ${created} ${m.label.toLowerCase()}${errors.length ? `, ${errors.length} row(s) failed` : ''}`, created, errors: errors.slice(0, 50), ignoredColumns: rows[0].filter((_, j) => !header[j]) });
});
export const dynamic = 'force-dynamic';
