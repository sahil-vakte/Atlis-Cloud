import { handler, ok, fail } from '@/lib/api';
import { parseFile } from '@/lib/cv';

/** Backwards-compatible endpoint: same response shape the old Vue bulk-upload screen and website forms expected. */
export const POST = handler(async (req) => {
  const form = await req.formData();
  const files = [...form.getAll('files'), ...form.getAll('file')].filter((f): f is File => f instanceof File);
  if (!files.length) return fail(422, 'No file uploaded.');
  const results = []; const errors: string[] = [];
  for (const f of files) {
    try {
      const { data } = await parseFile(f.name, Buffer.from(await f.arrayBuffer()));
      results.push({ filename: f.name, data: { ...data, location: data.location.formatted, locationDetail: data.location } });
    } catch (e: any) { errors.push(`${f.name}: ${e.message}`); }
  }
  return ok({ results, errors });
});

export const dynamic = 'force-dynamic';
