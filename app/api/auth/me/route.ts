import { handler, ok } from '@/lib/api';
import { one } from '@/lib/db';
export const GET = handler(async (_req, _ctx, user) => {
  const role = await one<{ title: string }>('SELECT title FROM roles WHERE id=?', [user.role]);
  return ok({ user, roleTitle: role?.title ?? '' });
});

export const dynamic = 'force-dynamic';
