import { handler, ok, fail } from '@/lib/api';
import { parseJobDescription } from '@/lib/matching';
import { extractText } from '@/lib/cv/extract';
export const POST = handler(async (req) => {
  let text = '';
  if ((req.headers.get('content-type') || '').includes('multipart')) {
    const f = (await req.formData()).get('file');
    if (f instanceof File) text = (await extractText(f.name, Buffer.from(await f.arrayBuffer()))).text;
  } else text = String((await req.json().catch(() => ({}))).text || '');
  if (text.trim().length < 20) return fail(400, 'Paste or upload a job description first.');
  return ok(await parseJobDescription(text));
});

export const dynamic = 'force-dynamic';
