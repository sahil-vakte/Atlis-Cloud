import ExcelJS from 'exceljs';
import { handler, listParams, moduleFor } from '@/lib/api';
import { exportRecords } from '@/lib/crud';
import { humanize } from '@/lib/schema';

type Ctx = { params: { module: string } };
export const GET = handler<Ctx>(async (req, { params }, user) => {
  const m = await moduleFor(params.module, user, 'export');
  const url = new URL(req.url);
  const { rows, cols } = await exportRecords(m, user, listParams(url));
  const val = (r: any, c: string) => r.__labels?.[c] ?? r[c] ?? '';
  const name = `${m.key}-${new Date().toISOString().slice(0, 10)}`;
  if (url.searchParams.get('format') === 'csv') {
    const esc = (v: any) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [cols.map(humanize).map(esc).join(','), ...rows.map((r) => cols.map((c) => esc(val(r, c))).join(','))].join('\r\n');
    return new Response('﻿' + csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${name}.csv"` } });
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(m.label.slice(0, 30));
  ws.columns = cols.map((c) => ({ header: humanize(c), key: c, width: Math.min(40, Math.max(12, humanize(c).length + 4)) }));
  rows.forEach((r) => ws.addRow(Object.fromEntries(cols.map((c) => [c, val(r, c)]))));
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00297B' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content-disposition': `attachment; filename="${name}.xlsx"` } });
});

export const dynamic = 'force-dynamic';
