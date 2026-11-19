import { handler, ok } from '@/lib/api';
import { query } from '@/lib/db';
import { HREF_ROUTES } from '@/lib/modules';

/** Sidebar is built from the `permissions` table + `permission_role`, exactly like the legacy LeftMenusController. */
export const GET = handler(async (_req, _ctx, user) => {
  const all = await query<any>(`SELECT id,name,displayName,href,parent_id,icon,\`order\` o FROM permissions WHERE status=1 AND is_menu=1 AND slug IN ('link','dropdown') ORDER BY \`order\`, id`);
  const granted = new Set((await query<any>('SELECT permission_id FROM permission_role WHERE role_id=?', [user.role])).map((r) => Number(r.permission_id)));
  const allowed = (id: number) => granted.has(id);
  const seen = new Set<string>();
  const items = all.filter((p) => p.parent_id === 0 && allowed(p.id)).map((p) => ({
    id: p.id, label: p.displayName || p.name, icon: p.icon, href: HREF_ROUTES[p.href] || `/legacy/${p.href}`,
    children: all.filter((c) => c.parent_id === p.id && allowed(c.id)).map((c) => ({ id: c.id, label: c.displayName || c.name, href: HREF_ROUTES[c.href] || `/legacy/${c.href}` })),
  })).filter((i) => { const k = i.href + i.label; if (seen.has(k)) return false; seen.add(k); return true; });
  return ok({ items });
});

export const dynamic = 'force-dynamic';
