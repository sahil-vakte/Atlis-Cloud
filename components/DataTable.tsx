'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as L from './icons';
import clsx from 'clsx';
import { api, qs, fmtDate, stripHtml, recordFileUrl } from '@/lib/client';
import { LookupSelect } from './fields';
import { Empty, Loading, StatusBadge, useConfirm, useToast } from './ui';

export type Meta = {
  key: string; label: string; singular: string; pk: string; titleField: string;
  listColumns: { name: string; label: string; kind: string }[]; filters: { name: string; label: string; lookup?: string; multi?: boolean }[];
  fields: any[]; sections: { title: string; fields: string[] }[]; softDelete: boolean; hasCreatedAt: boolean;
  related: { module: string; fk: string; label: string }[]; can: Record<'add' | 'edit' | 'delete' | 'restore' | 'export', boolean>; defaults: Record<string, any>;
};
const metaCache = new Map<string, Promise<Meta>>();
export const loadMeta = (m: string) => { if (!metaCache.has(m)) metaCache.set(m, api<Meta>(`/api/m/${m}/meta`).catch((e) => { metaCache.delete(m); throw e; })); return metaCache.get(m)!; };

export function Cell({ row, col, kind, module, pk }: { row: any; col: string; kind: string; module?: string; pk?: string }) {
  const label = row.__labels?.[col];
  const v = row[col];
  if (/^(status|active|isLogin|submitted|isSentToClient|publish|verificationStatus|approvalStatus|candidatureStatus|progressStatus|isDefault|winLost|inPipeline)$/.test(col)) return <StatusBadge value={label ?? v} />;
  if (label) return <span className="line-clamp-2">{label}</span>;
  if (v == null || v === '' || String(v).toUpperCase() === 'NULL' || (row.__labels && col in row.__labels)) return <span className="text-slate2/40">—</span>;
  if ((kind === 'date' || kind === 'datetime' || /(_at|Date|date)$/.test(col)) && !fmtDate(v)) return <span className="text-slate2/40">—</span>;
  if (kind === 'file') { return module && pk ? <a href={recordFileUrl(module, row[pk], col)} target="_blank" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-navy underline"><L.Paperclip className="h-3 w-3" />{String(v).split('/').pop()}</a> : <span className="text-xs text-slate2">{String(v).split('/').pop()}</span>; }
  if (kind === 'date' || kind === 'datetime' || /(_at|Date|date)$/.test(col)) return <span className="whitespace-nowrap">{fmtDate(v)}</span>;
  if (kind === 'bool') return <StatusBadge value={String(v)} />;
  if (kind === 'email') return <a href={`mailto:${v}`} onClick={(e) => e.stopPropagation()} className="text-navy hover:underline">{v}</a>;
  const s = kind === 'richtext' ? stripHtml(v) : String(v);
  return <span className="line-clamp-2 break-words" title={s.length > 80 ? s.slice(0, 500) : undefined}>{s.length > 140 ? s.slice(0, 140) + '…' : s}</span>;
}

export default function DataTable({ module, fk, compact, title, actions, defaultArchived = false }: { module: string; fk?: { column: string; value: string }; compact?: boolean; title?: string; actions?: React.ReactNode; defaultArchived?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, node: confirmNode } = useConfirm();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [err, setErr] = useState('');
  const [data, setData] = useState<{ rows: any[]; total: number; columns: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const profileList = module === 'profiles' && !compact;
  const newTab = profileList || (module === 'requirements' && !compact);
  const [booleanMode, setBooleanMode] = useState(false);
  const [booleanApplied, setBooleanApplied] = useState(false);
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({});
  const [q, setQ] = useState(''); const [dq, setDq] = useState('');
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(compact ? 10 : 25);
  const [sort, setSort] = useState<{ c: string; d: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [archived, setArchived] = useState(defaultArchived);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [colMenu, setColMenu] = useState(false);
  const requestVersion = useRef(0);

  useEffect(() => { loadMeta(module).then(setMeta).catch((e) => setErr(e.message)); }, [module]);
  useEffect(() => { try { setHidden(new Set(JSON.parse(localStorage.getItem(`atlis_cols_${module}`) || '[]'))); } catch {} }, [module]);
  useEffect(() => {
    if (booleanMode) return;
    const timer = setTimeout(() => { setDq(q); setBooleanApplied(false); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [q, booleanMode]);
  const updateFilter = (key: string, value: string) => {
    if (profileList) setDraftFilters((current) => ({ ...current, [key]: value }));
    else { setFilters((current) => ({ ...current, [key]: value })); setPage(1); }
  };
  const filterValues = profileList ? draftFilters : filters;
  const params = useMemo(() => ({ page, pageSize, q: dq, boolean: booleanApplied ? 1 : undefined, sort: sort?.c, dir: sort?.d, archived: archived ? 1 : undefined, fk: fk?.column, fkv: fk?.value, ...Object.fromEntries(Object.entries(filters).map(([k, v]) => [`f.${k}`, v])) }), [page, pageSize, dq, booleanApplied, sort, archived, fk?.column, fk?.value, filters]);
  const load = useCallback(() => {
    const version = ++requestVersion.current;
    setErr('');
    setLoading(true);
    api(`/api/m/${module}${qs(params)}`).then((r) => { if (version === requestVersion.current) { setData(r); setSel(new Set()); } }).catch((e) => { if (version === requestVersion.current) setErr(e.message); }).finally(() => { if (version === requestVersion.current) setLoading(false); });
  }, [module, params]);
  useEffect(() => { load(); return () => { requestVersion.current++; }; }, [load]);

  if (err && !meta) return <div className="card p-6 text-sm text-red-700">{err}</div>;
  if (!meta) return <div className="card"><Loading /></div>;
  const cols = meta.listColumns.filter((c) => !hidden.has(c.name) && c.name !== fk?.column);
  const pages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const base = `/m/${module}`;
  const newHref = `${base}/new${fk ? qs({ [fk.column]: fk.value }) : ''}`;

  const bulk = async (kind: 'delete' | 'restore') => {
    if (!(await confirm(kind === 'delete' ? `${meta.softDelete ? 'Archive' : 'Delete'} ${sel.size} record(s)?` : `Restore ${sel.size} record(s)?`, kind === 'delete'))) return;
    let n = 0;
    for (const id of sel) { try { await api(`/api/m/${module}/${id}`, { method: kind === 'delete' ? 'DELETE' : 'PATCH' }); n++; } catch (e: any) { toast('error', e.message); } }
    toast('success', `${n} record(s) ${kind === 'delete' ? (meta.softDelete ? 'archived' : 'deleted') : 'restored'}`); load();
  };
  const exportUrl = (fmt: string) => `/api/m/${module}/export${qs({ ...params, page: undefined, pageSize: undefined, format: fmt })}`;
  const toggleCol = (c: string) => { const h = new Set(hidden); h.has(c) ? h.delete(c) : h.add(c); setHidden(h); try { localStorage.setItem(`atlis_cols_${module}`, JSON.stringify([...h])); } catch {} };

  return (
    <div className="card overflow-hidden">
      {confirmNode}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E6EBF4] px-4 py-3">
        {title && <h3 className="mr-2 text-sm font-bold text-navy">{title}</h3>}
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <L.Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate2" />
          <input aria-label={booleanMode ? 'Boolean search' : 'Search records'} className="input h-9 pl-8" placeholder={booleanMode ? 'Example: (BizTalk OR Azure) AND NOT Java' : `Search ${meta.label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (booleanMode && e.key === 'Enter') { setBooleanApplied(true); setDq(q); setPage(1); } }} />
        </div>
        {profileList && <button className="btn-outline btn-sm h-9" aria-pressed={booleanMode} onClick={() => setBooleanMode((value) => !value)}>Boolean search</button>}
        {profileList && booleanMode && <button className="btn-primary btn-sm h-9" onClick={() => { setBooleanApplied(true); setDq(q); setPage(1); }}>Search</button>}
        {(meta.filters.length > 0 || meta.hasCreatedAt) && <button className={clsx('btn-outline btn-sm h-9', activeFilters && 'border-navy')} onClick={() => setShowFilters((s) => !s)}><L.SlidersHorizontal className="h-3.5 w-3.5" /> Filters{activeFilters ? ` (${activeFilters})` : ''}</button>}
        {meta.softDelete && meta.can.restore && <button className={clsx('btn-outline btn-sm h-9', archived && 'bg-navy text-white hover:bg-navy-700')} onClick={() => { setArchived((a) => !a); setPage(1); }}><L.Archive className="h-3.5 w-3.5" /> {archived ? 'Showing archived' : 'Archived'}</button>}
        <div className="ml-auto flex items-center gap-2">
          {sel.size > 0 && (archived ? meta.can.restore && <button className="btn-outline btn-sm h-9" onClick={() => bulk('restore')}><L.ArchiveRestore className="h-3.5 w-3.5" /> Restore {sel.size}</button>
            : meta.can.delete && <button className="btn-outline btn-sm h-9 text-red-700" onClick={() => bulk('delete')}><L.Trash2 className="h-3.5 w-3.5" /> {meta.softDelete ? 'Archive' : 'Delete'} {sel.size}</button>)}
          {!compact && (
            <div className="relative">
              <button className="btn-outline btn-sm h-9" onClick={() => setColMenu((s) => !s)} title="Columns"><L.Columns3 className="h-3.5 w-3.5" /></button>
              {colMenu && <div className="card absolute right-0 z-20 mt-1 w-56 p-2" onMouseLeave={() => setColMenu(false)}>
                {meta.listColumns.map((c) => <label key={c.name} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-navy-50"><input type="checkbox" checked={!hidden.has(c.name)} onChange={() => toggleCol(c.name)} /> {c.label}</label>)}
              </div>}
            </div>
          )}
          {meta.can.export && <div className="flex"><a className="btn-outline btn-sm h-9 rounded-r-none" href={exportUrl('xlsx')}><L.Download className="h-3.5 w-3.5" /> Excel</a><a className="btn-outline btn-sm h-9 rounded-l-none border-l-0" href={exportUrl('csv')}>CSV</a></div>}
          {actions}
          {meta.can.add && !archived && !compact && <label className="btn-outline btn-sm h-9 cursor-pointer" title="Import from Excel or CSV — use the field names or labels as column headings"><L.Upload className="h-3.5 w-3.5" /> Import
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; const fd = new FormData(); fd.append('file', f);
              try { const r = await api(`/api/m/${module}/import`, { method: 'POST', body: fd }); toast(r.errors?.length ? 'error' : 'success', r.message + (r.errors?.length ? ` — ${r.errors[0]}` : '')); load(); } catch (err: any) { toast('error', err.message); } }} /></label>}
          {meta.can.add && !archived && <Link href={newHref} className="btn-primary btn-sm h-9"><L.Plus className="h-4 w-4" /> New {meta.singular.toLowerCase()}</Link>}
        </div>
      </div>
      {err && <div role="alert" className="border-b border-red-200 px-4 py-3 text-sm text-red-700">{err}</div>}
      {showFilters && (
        <div className="grid gap-3 border-b border-[#E6EBF4] bg-[#F8FAFD] px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          {meta.filters.map((f) => (
            <div key={f.name}><label className="label">{f.label}</label>
              {f.lookup ? <LookupSelect lookup={f.lookup} multi={f.multi} value={filterValues[f.name] || ''} onChange={(v) => updateFilter(f.name, v)} placeholder="Any" />
                : <input className="input" placeholder={f.name === 'designationKeyword' ? 'BizTalk / Azure' : undefined} value={filterValues[f.name] || ''} onChange={(e) => updateFilter(f.name, e.target.value)} />}
            </div>
          ))}
          {meta.hasCreatedAt && <>
            <div><label className="label">Added from</label><input type="date" className="input" value={filterValues.created_at__from || ''} onChange={(e) => updateFilter('created_at__from', e.target.value)} /></div>
            <div><label className="label">Added to</label><input type="date" className="input" value={filterValues.created_at__to || ''} onChange={(e) => updateFilter('created_at__to', e.target.value)} /></div>
          </>}
          <div className="flex items-end gap-2">
            {profileList && <button className="btn-primary btn-sm" onClick={() => { setFilters(draftFilters); setPage(1); }}>Apply filters</button>}
            <button className="btn-ghost btn-sm" onClick={() => { setDraftFilters({}); setFilters({}); setPage(1); }}>Clear filters</button>
          </div>
        </div>
      )}
      <div className={clsx('relative', loading && 'min-h-36')}>
        <div role="status" aria-live="polite" aria-atomic="true" className={loading ? 'pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-white/80 px-4 py-6' : 'sr-only'}>
          {loading && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-[#E6EBF4] bg-white px-5 py-3 shadow-sm">
              <img src="/brand/atlis-cloud_logo_horizontal_navy.svg" alt="" width={128} height={30} className="h-7 w-32 object-contain motion-safe:animate-pulse" />
              <span className="text-sm font-medium text-navy">Loading results…</span>
            </div>
          )}
        </div>
        <div className="overflow-x-auto" aria-busy={loading}>
          {data && data.rows.length === 0 && !loading ? (
            <Empty title={archived ? 'Nothing archived' : `No ${meta.label.toLowerCase()} yet`} text={dq || activeFilters ? 'Try a different search or clear the filters.' : undefined}
              action={meta.can.add && !archived && !dq ? <Link href={newHref} className="btn-primary btn-sm"><L.Plus className="h-4 w-4" /> New {meta.singular.toLowerCase()}</Link> : undefined} />
          ) : !data ? null : (
            <table className="w-full min-w-[720px]">
              <thead className="bg-[#F8FAFD]"><tr>
                {(meta.can.delete || meta.can.restore) && <th className="th w-8"><input type="checkbox" checked={sel.size > 0 && sel.size === data.rows.length} onChange={(e) => setSel(e.target.checked ? new Set(data.rows.map((r) => String(r[meta.pk]))) : new Set())} /></th>}
                {cols.map((c) => (
                  <th key={c.name} className="th cursor-pointer select-none hover:text-navy" onClick={() => setSort((s) => (s?.c === c.name ? { c: c.name, d: s.d === 'asc' ? 'desc' : 'asc' } : { c: c.name, d: 'desc' }))}>
                    <span className="inline-flex items-center gap-1">{c.name === meta.pk ? 'ID' : c.label}{sort?.c === c.name && (sort.d === 'asc' ? <L.ArrowUp className="h-3 w-3" /> : <L.ArrowDown className="h-3 w-3" />)}</span>
                  </th>
                ))}
                {newTab && <th className="th">Actions</th>}
              </tr></thead>
              <tbody className="divide-y divide-[#EEF2F8]">
                {data.rows.map((r) => {
                  const id = String(r[meta.pk]);
                  return (
                    <tr key={id} className="cursor-pointer hover:bg-[#F8FAFD]" onClick={() => router.push(`${base}/${id}`)}>
                      {(meta.can.delete || meta.can.restore) && <td className="td" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.has(id)} onChange={(e) => { const s = new Set(sel); e.target.checked ? s.add(id) : s.delete(id); setSel(s); }} /></td>}
                      {cols.map((c) => (
                        <td key={c.name} className={clsx('td max-w-[280px]', c.name === meta.titleField && 'font-semibold text-navy', c.name === meta.pk && 'text-xs font-mono text-slate2')}><Cell row={r} col={c.name} kind={c.kind} module={module} pk={meta.pk} /></td>
                      ))}
                      {newTab && <td className="td"><a href={base + '/' + id} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-navy underline" onClick={(e) => e.stopPropagation()}>Open in new tab</a></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E6EBF4] px-4 py-2.5 text-xs text-slate2">
          <span>{((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, data.total).toLocaleString()} of {data.total.toLocaleString()}</span>
          <div className="flex items-center gap-2">
            <select className="input h-8 w-auto py-0 text-xs" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10, 25, 50, 100, 250].map((n) => <option key={n} value={n}>{n} / page</option>)}</select>
            <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(1)}><L.ChevronsLeft className="h-3.5 w-3.5" /></button>
            <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><L.ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="px-1 font-semibold text-navy">{page} / {pages}</span>
            <button className="btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><L.ChevronRight className="h-3.5 w-3.5" /></button>
            <button className="btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage(pages)}><L.ChevronsRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
