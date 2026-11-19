import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || './storage/uploads');
export const ALLOWED_EXT = new Set(['pdf', 'doc', 'docx', 'rtf', 'txt', 'odt', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'xls', 'xlsx', 'csv', 'zip', 'msg', 'eml']);

export function safeName(name: string) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const base = name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60) || 'file';
  return { ext, file: `${base}_${crypto.randomBytes(4).toString('hex')}.${ext}` };
}
export async function saveUpload(folder: string, file: File) {
  const { ext, file: fname } = safeName(file.name);
  if (!ALLOWED_EXT.has(ext)) throw new Error(`File type .${ext} is not allowed`);
  const dir = path.join(UPLOAD_ROOT, folder.replace(/[^A-Za-z0-9_\/-]/g, ''));
  await fs.mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, fname), buf);
  return { fileName: fname, relPath: path.posix.join(folder, fname), size: buf.length, buffer: buf, ext };
}
export function resolveStored(rel: string) {
  const p = path.resolve(UPLOAD_ROOT, rel);
  if (!p.startsWith(UPLOAD_ROOT)) throw new Error('Invalid path');
  return p;
}
