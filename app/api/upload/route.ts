import { handler, ok, fail } from '@/lib/api';
import { saveUpload } from '@/lib/storage';
import { getSettings } from '@/lib/settings';

export const POST = handler(async (req) => {
  const form = await req.formData();
  const file = form.get('file');
  const folder = String(form.get('folder') || 'misc');
  if (!(file instanceof File)) return fail(400, 'No file uploaded');
  const max = Number((await getSettings()).cv_max_upload_mb || 15) * 1024 * 1024;
  if (file.size > max) return fail(413, 'File is too large');
  const saved = await saveUpload(folder, file);
  return ok({ status: 'success', fileName: saved.fileName, path: saved.relPath, size: saved.size });
});

export const dynamic = 'force-dynamic';
