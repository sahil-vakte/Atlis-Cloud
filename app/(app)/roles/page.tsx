'use client';
import { useEffect, useMemo, useState } from 'react';
import * as L from '@/components/icons';
import clsx from 'clsx';
import { api } from '@/lib/client';
import { Loading, PageHeader, Spinner, useToast } from '@/components/ui';

export default function Roles() {
  const toast = useToast();
  const [d, setD] = useState<any>(null);
  const [role, setRole] = useState<number | null>(null);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [newRole, setNewRole] = useState('');
  const load = () => api('/api/roles').then((r) => { setD(r); if (role == null && r.roles[0]) pick(r, r.roles[0].id); }).catch((e) => toast('error', e.message));
  const pick = (data: any, id: number) => { setRole(id); setTitle(data.roles.find((r: any) => r.id === id)?.title || ''); setSel(new Set(data.matrix.filter((m: any) => m.role_id === id).map((m: any) => m.permission_id))); };
  useEffect(() => { load(); }, []); // eslint-disable-line
  const tree = useMemo(() => {
    if (!d) return [];
    const byParent = (p: number) => d.perms.filter((x: any) => x.parent_id === p);
    const build = (p: any): any => ({ ...p, children: byParent(p.id).map(build) });
    return byParent(0).map(build);
  }, [d]);
  if (!d) return <Loading />;
  const toggle = (p: any, on: boolean) => {
    const s = new Set(sel);
    const walk = (n: any) => { on ? s.add(n.id) : s.delete(n.id); n.children?.forEach(walk); };
    walk(p); setSel(s);
  };
  const save = async () => { setBusy(true); try { await api(`/api/roles/${role}`, { method: 'PUT', json: { title, permissionIds: [...sel] } }); toast('success', 'Role saved'); load(); } catch (e: any) { toast('error', e.message); } finally { setBusy(false); } };
  const create = async () => { if (!newRole.trim()) return; try { await api('/api/roles', { method: 'POST', json: { title: newRole } }); setNewRole(''); toast('success', 'Role created'); load(); } catch (e: any) { toast('error', e.message); } };
  const Node = ({ n, depth }: { n: any; depth: number }) => (
    <div>
      <label className={clsx('flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-navy-50', depth === 0 && 'mt-2 font-semibold text-navy')} style={{ paddingLeft: 8 + depth * 22 }}>
        <input type="checkbox" checked={sel.has(n.id)} onChange={(e) => toggle(n, e.target.checked)} />
        <span className="text-sm">{n.slug === 'options' ? n.name : n.displayName || n.name}</span>
        {n.slug === 'options' ? <span className="badge bg-[#F4F6FB] text-slate2">action</span> : n.is_menu ? <span className="badge bg-navy-50 text-navy">menu</span> : null}
      </label>
      {n.children.map((c: any) => <Node key={c.id} n={c} depth={depth + 1} />)}
    </div>
  );
  return (
    <>
      <PageHeader title="Roles & permissions" sub="Choose which menus and actions each role can use. Changes apply at the user's next page load." />
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="card p-3">
          {d.roles.map((r: any) => (
            <button key={r.id} onClick={() => pick(d, r.id)} className={clsx('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm', role === r.id ? 'bg-navy text-white' : 'hover:bg-navy-50', r.status !== '1' && 'opacity-50')}>
              <span className="font-semibold">{r.title}</span><span className={clsx('text-xs', role === r.id ? 'text-[#B3C0DB]' : 'text-slate2')}>{r.users} users</span>
            </button>))}
          <div className="mt-3 flex gap-2 border-t border-[#E6EBF4] pt-3"><input className="input h-9" placeholder="New role name" value={newRole} onChange={(e) => setNewRole(e.target.value)} /><button className="btn-primary btn-sm" onClick={create}><L.Plus className="h-4 w-4" /></button></div>
        </div>
        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="flex-1"><label className="label">Role name</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <button className="btn-outline" onClick={() => setSel(new Set(d.perms.map((p: any) => p.id)))}>Select all</button>
            <button className="btn-outline" onClick={() => setSel(new Set())}>Clear</button>
            <button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Spinner /> : <L.Save className="h-4 w-4" />} Save role</button>
          </div>
          <p className="mb-2 text-xs text-slate2">{sel.size} of {d.perms.length} permissions granted</p>
          <div className="max-h-[65vh] overflow-y-auto pr-2">{tree.map((n: any) => <Node key={n.id} n={n} depth={0} />)}</div>
        </div>
      </div>
    </>
  );
}
