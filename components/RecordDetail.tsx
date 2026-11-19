'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import * as L from './icons';
import clsx from 'clsx';
import { api, fileUrl } from '@/lib/client';
import DataTable, { Cell, loadMeta, type Meta } from './DataTable';
import { Loading, PageHeader, useConfirm, useToast } from './ui';
import ModuleActions, { ExtraTabs } from './ModuleActions';

export default function RecordDetail({ module, id }: { module: string; id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [row, setRow] = useState<any>(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('overview');
  const load = useCallback(() => api(`/api/m/${module}/${id}`).then(setRow).catch((e) => setErr(e.message)), [module, id]);
  useEffect(() => { loadMeta(module).then(setMeta).catch((e) => setErr(e.message)); load(); }, [module, load]);

  if (err) return <div className="card p-6 text-sm text-red-700">{err} <Link href={`/m/${module}`} className="ml-2 underline">Back to list</Link></div>;
  if (!meta || !row) return <Loading />;
  const archived = meta.softDelete && (Number(row.deleted) === 1 || Number(row.is_deleted) === 1);
  const fieldBy = Object.fromEntries(meta.fields.map((f: any) => [f.name, f]));
  const title = row[meta.titleField] || `${meta.singular} #${id}`;

  const remove = async () => {
    if (!(await confirm(meta.softDelete ? `Archive this ${meta.singular.toLowerCase()}? You can restore it later.` : `Delete this ${meta.singular.toLowerCase()} permanently?`))) return;
    try { await api(`/api/m/${module}/${id}`, { method: 'DELETE' }); toast('success', meta.softDelete ? 'Archived' : 'Deleted'); router.push(`/m/${module}`); } catch (e: any) { toast('error', e.message); }
  };
  const restore = async () => { try { await api(`/api/m/${module}/${id}`, { method: 'PATCH' }); toast('success', 'Restored'); load(); } catch (e: any) { toast('error', e.message); } };
  const extra = ExtraTabs(module, row);
  const tabs = [{ key: 'overview', label: 'Overview' }, ...extra.map((t) => ({ key: t.key, label: t.label })), ...meta.related.map((r) => ({ key: `rel:${r.module}:${r.fk}`, label: r.label }))];

  return (
    <div>
      {node}
      <PageHeader crumbs={<Link href={`/m/${module}`} className="hover:underline">{meta.label}</Link>} title={<span className="flex items-center gap-3">{title}{archived && <span className="badge bg-amber-50 text-amber-700">Archived</span>}</span>}
        sub={<span className="font-mono text-xs">#{id}</span>}
        actions={<>
          <ModuleActions module={module} row={row} reload={load} />
          {meta.can.edit && !archived && <Link href={`/m/${module}/${id}/edit`} className="btn-primary"><L.Pencil className="h-4 w-4" /> Edit</Link>}
          {archived ? meta.can.restore && <button className="btn-outline" onClick={restore}><L.ArchiveRestore className="h-4 w-4" /> Restore</button>
            : meta.can.delete && <button className="btn-outline text-red-700" onClick={remove}><L.Trash2 className="h-4 w-4" /> {meta.softDelete ? 'Archive' : 'Delete'}</button>}
        </>} />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-[#E6EBF4]">
        {tabs.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={clsx('tab', tab === t.key && 'tab-active')}>{t.label}</button>)}
      </div>
      {tab === 'overview' && (
        <div className="space-y-5">
          {meta.sections.map((s) => {
            const empty = (n: string) => { const v = row[n]; if (v === null || v === undefined || v === '' || String(v).toUpperCase() === 'NULL') return true;
              const k = fieldBy[n]?.kind; if ((k === 'select' || k === 'multiselect') && (String(v) === '0' || (row.__labels && n in row.__labels && !row.__labels[n]))) return true;
              if ((k === 'date' || k === 'datetime') && /^(0000|1970-01-0[12])/.test(String(v))) return true;
              return k === 'number' && String(v) === '0' && !/(status|count|rate|amount|positions)/i.test(n); };
            const fields = s.fields.filter((n) => !empty(n));
            if (!fields.length) return null;
            return (
              <section key={s.title} className="card p-5">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate2">{s.title}</h2>
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                  {fields.map((n) => {
                    const f = fieldBy[n]; const wide = f && ['textarea', 'richtext'].includes(f.kind);
                    return (
                      <div key={n} className={clsx(wide && 'sm:col-span-2 xl:col-span-3')}>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate2">{f?.label || n}</dt>
                        <dd className="mt-0.5 text-sm text-[#0B1B3F]">
                          {f?.kind === 'richtext' ? <div className="rich max-w-none" dangerouslySetInnerHTML={{ __html: sanitize(String(row[n])) }} />
                            : f?.kind === 'textarea' ? <p className="whitespace-pre-wrap">{String(row[n])}</p>
                            : f?.kind === 'url' ? <a className="text-navy underline" href={String(row[n]).startsWith('http') ? row[n] : `https://${row[n]}`} target="_blank">{row[n]}</a>
                            : <Cell row={row} col={n} kind={f?.kind || 'text'} module={module} pk={meta.pk} />}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            );
          })}
          <p className="text-xs text-slate2">{row.created_at && `Created ${String(row.created_at).slice(0, 16)}`}{row.updated_at && ` · Updated ${String(row.updated_at).slice(0, 16)}`}</p>
        </div>
      )}
      {extra.map((t) => tab === t.key && <div key={t.key}>{t.render()}</div>)}
      {meta.related.map((r) => tab === `rel:${r.module}:${r.fk}` && <DataTable key={r.module + r.fk} module={r.module} fk={{ column: r.fk, value: String(row[meta.pk]) }} compact title={r.label} />)}
    </div>
  );
}

// basic HTML sanitiser for stored rich text (removes scripts, event handlers and javascript: links)
function sanitize(html: string) {
  return html.replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, '').replace(/\son\w+="[^"]*"/gi, '').replace(/\son\w+='[^']*'/gi, '').replace(/javascript:/gi, '');
}
export { fileUrl };
