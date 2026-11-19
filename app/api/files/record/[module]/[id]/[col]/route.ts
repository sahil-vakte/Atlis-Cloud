import fs from 'node:fs/promises';
import path from 'node:path';
import { handler, fail, moduleFor } from '@/lib/api';
import { getRecord } from '@/lib/crud';
import { resolveRecordFile } from '@/lib/files';
import { one, exec, ident } from '@/lib/db';
import { getTable } from '@/lib/schema';

const TYPES: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', txt: 'text/plain; charset=utf-8', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel', csv: 'text/csv' };
type Ctx = { params: { module: string; id: string; col: string } };
/** Download a file attached to a record — access is checked against the record, so portal users only reach their own files. */
export const GET = handler<Ctx>(async (req, { params }, user) => {
  const m = await moduleFor(params.module, user);
  const visible = await getRecord(m, user, params.id);
  if (!visible) return fail(404, 'Not found');
  const t = getTable(m.table);
  const row = await one(`SELECT * FROM ${ident(t.name)} WHERE ${ident(t.pk)}=?`, [params.id]);
  if (!row || !(params.col in row)) return fail(404, 'Not found');
  const file = await resolveRecordFile(m, row, params.col);
  if (!file) return fail(404, 'The file is not on this server. Copy the old uploads folder to LEGACY_UPLOAD_DIR.');
  const ext = path.extname(file).slice(1).toLowerCase();
  const download = new URL(req.url).searchParams.get('download') === '1';
  if (m.key === 'profiles' || m.key === 'cv-versions') {
    // same counter the legacy CV download restriction used
    const r = await exec('UPDATE cv_download_tracking SET download_count=download_count+1, last_download_time=NOW() WHERE user_id=?', [user.id]).catch(() => null);
    if (r && !r.affectedRows) await exec('INSERT INTO cv_download_tracking (user_id, download_count, document_download_count, last_download_time) VALUES (?,1,0,NOW())', [user.id]).catch(() => null);
  }
  return new Response(await fs.readFile(file), { headers: { 'content-type': TYPES[ext] || 'application/octet-stream', 'content-disposition': `${download ? 'attachment' : 'inline'}; filename="${path.basename(file)}"`, 'cache-control': 'private, max-age=300' } });
});
export const dynamic = 'force-dynamic';
