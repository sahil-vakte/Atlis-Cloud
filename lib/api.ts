import { NextResponse } from 'next/server';
import { getSession, type SessionUser } from './session';
import { getModule, type ModuleDef } from './modules';
import { canAccess, canDo, type Action } from './permissions';

export class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }
export const ok = (data: any, init?: ResponseInit) => NextResponse.json(data, init);
export const fail = (status: number, message: string) => NextResponse.json({ status: 'error', message }, { status });

export function handler<C = any>(fn: (req: Request, ctx: C, user: SessionUser) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      const user = await getSession();
      if (!user) return fail(401, 'Your session has expired. Please sign in again.');
      return await fn(req, ctx, user);
    } catch (e: any) {
      if (e?.digest === 'DYNAMIC_SERVER_USAGE' || e?.digest?.startsWith?.('NEXT_')) throw e;
      if (e instanceof HttpError) return fail(e.status, e.message);
      if (e?.status === 400 || e?.status === 403) return fail(e.status, e.message);
      console.error(e);
      return fail(500, e?.sqlMessage || e?.message || 'Unexpected error');
    }
  };
}

export async function moduleFor(key: string, user: SessionUser, action?: Action): Promise<ModuleDef> {
  const m = getModule(key);
  if (!m) throw new HttpError(404, 'Unknown module');
  if (!(await canAccess(user, m))) throw new HttpError(403, 'You do not have access to this area');
  if (action && !(await canDo(user, m, action))) throw new HttpError(403, `You do not have permission to ${action} ${m.label.toLowerCase()}`);
  return m;
}

export function listParams(url: URL) {
  const filters: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { if (k.startsWith('f.')) filters[k.slice(2)] = v; });
  const fkc = url.searchParams.get('fk'); const fkv = url.searchParams.get('fkv');
  return {
    page: Number(url.searchParams.get('page') || 1),
    pageSize: Number(url.searchParams.get('pageSize') || 25),
    q: url.searchParams.get('q') || '',
    booleanSearch: url.searchParams.get('boolean') === '1',
    sort: url.searchParams.get('sort') || undefined,
    dir: (url.searchParams.get('dir') as 'asc' | 'desc') || undefined,
    archived: url.searchParams.get('archived') === '1',
    filters,
    fk: fkc && fkv ? { column: fkc, value: fkv } : undefined,
  };
}
