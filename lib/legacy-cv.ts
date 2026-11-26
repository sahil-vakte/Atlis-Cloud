import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { UPLOAD_ROOT } from './storage';

export function legacyCvKey(module: string, row: any, column: string): string | null {
  if (!((module === 'profiles' && column === 'resumeName') || (module === 'cv-versions' && column === 'cvName'))) return null;
  const id = String(row.pID ?? '');
  const value = String(row[column] ?? '').trim().replace(/\\/g, '/');
  if (!/^\d+$/.test(id) || !value || value.toUpperCase() === 'NULL' || value.split('/').includes('..')) return null;
  return `${id}/${path.posix.basename(value)}`;
}

let client: S3Client | undefined;
const pending = new Map<string, Promise<string | null>>();

/** Called only after record authorization and local file resolution. */
export async function fetchLegacyCv(key: string): Promise<string | null> {
  const backup = process.env.LEGACY_CV_BACKUP_DIR;
  if (backup) {
    const root = await fs.realpath(backup);
    const target = path.resolve(root, key);
    if (target.startsWith(root + path.sep)) {
      try {
        const real = await fs.realpath(target);
        if (real.startsWith(root + path.sep) && (await fs.stat(real)).isFile()) return real;
      } catch (e: any) {
        if (e.code !== 'ENOENT' && e.code !== 'ENOTDIR') throw e;
      }
    }
  }
  const bucket = process.env.LEGACY_CV_S3_BUCKET;
  if (!bucket) return null;
  const existing = pending.get(key);
  if (existing) return existing;
  const job = (async () => {
    client ??= new S3Client({ region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION, maxAttempts: 2, requestHandler: { connectionTimeout: 5000, requestTimeout: 15000 } });
    const target = path.join(UPLOAD_ROOT, 'legacy-cv-cache', crypto.createHash('sha256').update(`${bucket}/${key}`).digest('hex'), path.posix.basename(key));
    try { if ((await fs.stat(target)).isFile()) return target; } catch { /* not cached */ }
    try {
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!result.Body) return null;
      const bytes = await result.Body.transformToByteArray();
      await fs.mkdir(path.dirname(target), { recursive: true });
      const temp = `${target}.${crypto.randomUUID()}.tmp`;
      try { await fs.writeFile(temp, bytes, { mode: 0o600 }); await fs.rename(temp, target); }
      finally { await fs.rm(temp, { force: true }); }
      return target;
    } catch (e: any) {
      if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return null;
      // Do not expose storage credentials, bucket names or signed URLs in API errors.
      throw new Error('The original CV storage is unavailable. Please ask an administrator to restore storage access or upload the CV again.');
    }
  })();
  pending.set(key, job);
  try { return await job; } finally { pending.delete(key); }
}
