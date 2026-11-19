import fs from 'node:fs/promises';
import path from 'node:path';
import { handler, fail } from '@/lib/api';
import { resolveStored } from '@/lib/storage';

const TYPES: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', txt: 'text/plain', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
type Ctx = { params: { path: string[] } };
export const GET = handler<Ctx>(async (_req, { params }, user) => {
  // raw paths are for staff only; portal users go through /api/files/record/... which checks record access
  if ([3, 16, 17, 29, 26, 31].includes(user.role) && !params.path[0]?.startsWith('branding')) return fail(403, 'Not allowed');
  const rel = params.path.map(decodeURIComponent).join('/');
  let file: string;
  try { file = resolveStored(rel); await fs.access(file); } catch { return fail(404, 'File not found'); }
  const ext = path.extname(file).slice(1).toLowerCase();
  const buf = await fs.readFile(file);
  return new Response(buf, { headers: { 'content-type': TYPES[ext] || 'application/octet-stream', 'content-disposition': `inline; filename="${path.basename(file)}"` } });
});

export const dynamic = 'force-dynamic';
