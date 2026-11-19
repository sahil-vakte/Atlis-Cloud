import { HttpError } from './api';
import { grantedSet, ADMIN_ROLE } from './permissions';
import type { SessionUser } from './session';
export async function requireAny(u: SessionUser, perms: string[]) {
  if (u.role === ADMIN_ROLE) return;
  const g = await grantedSet(u);
  if (!perms.some((p) => g.has(p))) throw new HttpError(403, 'You do not have access to this report');
}
