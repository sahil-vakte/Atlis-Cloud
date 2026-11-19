import { query } from './db';
import type { SessionUser } from './session';
import type { ModuleDef } from './modules';

export const ADMIN_ROLE = 1;
type PermRow = { id: number; name: string; displayName: string; href: string | null; check_slug: string };

let allPermsCache: { at: number; rows: PermRow[] } | null = null;
async function allPerms(): Promise<PermRow[]> {
  if (allPermsCache && Date.now() - allPermsCache.at < 60_000) return allPermsCache.rows;
  const rows = await query<PermRow>('SELECT id,name,displayName,href,check_slug FROM permissions WHERE status=1');
  allPermsCache = { at: Date.now(), rows };
  return rows;
}
export function clearPermissionCache() { allPermsCache = null; }

/** Every identifier the user's role is granted: names, option codes, hrefs and check slugs. */
export async function grantedSet(u: SessionUser): Promise<Set<string>> {
  const rows = await query<PermRow>(
    `SELECT p.id,p.name,p.displayName,p.href,p.check_slug FROM permissions p
     JOIN permission_role pr ON pr.permission_id=p.id WHERE pr.role_id=? AND p.status=1`, [u.role]);
  const s = new Set<string>();
  for (const r of rows) [r.name, r.displayName, r.href, r.check_slug].forEach((v) => v && s.add(v));
  return s;
}

export async function canAccess(u: SessionUser, m: ModuleDef) {
  if (u.role === ADMIN_ROLE) return true;
  const g = await grantedSet(u);
  return m.perms.some((p) => g.has(p));
}

export type Action = 'add' | 'edit' | 'delete' | 'restore' | 'export';
export async function canDo(u: SessionUser, m: ModuleDef, action: Action) {
  if (m.readOnly && action !== 'export') return false;
  if (u.viewOnly && action !== 'export') return false;
  if (u.role === ADMIN_ROLE) return true;
  if (!(await canAccess(u, m))) return false;
  // portal users may add/edit their own records (rows are restricted by the module's scope)
  if (m.portalEdit && (action === 'add' || action === 'edit') && m.scope?.(u)) {
    const g = await grantedSet(u);
    if (m.portalEdit.some((p) => g.has(p))) return true;
  }
  if (!m.actionPrefix) return true;
  const code = `${m.actionPrefix}_${action}`;
  const exists = (await allPerms()).some((p) => p.displayName === code);
  if (!exists) return true; // action not separately controlled in the permission matrix
  return (await grantedSet(u)).has(code);
}
