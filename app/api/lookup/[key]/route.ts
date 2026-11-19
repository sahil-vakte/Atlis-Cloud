import { handler, ok } from '@/lib/api';
import { lookupOptions } from '@/lib/crud';
type Ctx = { params: { key: string } };
export const GET = handler<Ctx>(async (req, { params }) => {
  const url = new URL(req.url);
  const ids = url.searchParams.get('ids')?.split(',').filter(Boolean);
  return ok(await lookupOptions(decodeURIComponent(params.key), url.searchParams.get('q') || '', Number(url.searchParams.get('limit') || 50), ids));
});

export const dynamic = 'force-dynamic';
