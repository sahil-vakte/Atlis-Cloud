import { handler, ok, fail } from '@/lib/api';
import { parseFile, findDuplicates, logParse } from '@/lib/cv';
import { saveUpload } from '@/lib/storage';
import { getSettings } from '@/lib/settings';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Parse one or many CVs. Files are kept in a pending folder so a profile can be created from them afterwards. */
export const POST = handler(async (req, _ctx, user) => {
  const form = await req.formData();
  const files = form.getAll('files').concat(form.getAll('file')).filter((f): f is File => f instanceof File);
  if (!files.length) return fail(400, 'Choose at least one CV to parse.');
  if (files.length > 50) return fail(400, 'You can parse up to 50 CVs at a time.');
  const maxMb = Number((await getSettings()).cv_max_upload_mb || 15);
  const results = [];
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    try {
      if (f.size > maxMb * 1024 * 1024) throw new Error(`File is larger than ${maxMb} MB`);
      const saved = await saveUpload(`cv-pending/${user.id}`, f);
      const r = await parseFile(f.name, saved.buffer);
      const duplicates = await findDuplicates(r.data);
      await logParse({ userId: user.id, fileName: f.name, fileType: ext, status: 'parsed', confidence: r.data.confidence.overall, durationMs: r.durationMs, warnings: r.data.warnings });
      results.push({ fileName: f.name, ok: true, file: saved.relPath, method: r.method, durationMs: r.durationMs, duplicates, data: r.data });
    } catch (e: any) {
      await logParse({ userId: user.id, fileName: f.name, fileType: ext, status: 'failed', warnings: [e?.message || 'error'] });
      results.push({ fileName: f.name, ok: false, error: e?.message || 'Could not read this file' });
    }
  }
  return ok({ results });
});

export const dynamic = 'force-dynamic';
