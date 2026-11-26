'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as L from './icons';
import clsx from 'clsx';
import { api, fileUrl } from '@/lib/client';
import { Spinner } from './ui';

export type FieldMeta = { name: string; label: string; kind: string; lookup?: string; enumValues?: string[]; required?: boolean; maxLength?: number };
type Opt = { value: string; label: string };

const optCache = new Map<string, Promise<Opt[]>>();
export function loadOptions(lookup: string, q = '', ids?: string[]) {
  const key = `${lookup}|${q}|${ids?.join(',') || ''}`;
  if (!optCache.has(key)) optCache.set(key, api<Opt[]>(`/api/lookup/${encodeURIComponent(lookup)}?limit=${q ? 50 : 200}&q=${encodeURIComponent(q)}${ids?.length ? `&ids=${ids.join(',')}` : ''}`).catch(() => { optCache.delete(key); return []; }));
  return optCache.get(key)!;
}

export function LookupSelect({ lookup, value, onChange, multi, placeholder, disabled }: { lookup: string; value: any; onChange: (v: any) => void; multi?: boolean; placeholder?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState<Opt[]>([]);
  const [known, setKnown] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected: string[] = useMemo(() => (value == null || value === '' ? [] : String(value).split(',').map((x) => x.trim()).filter(Boolean)), [value]);

  useEffect(() => {
    const missing = selected.filter((s) => !(s in known));
    if (missing.length) loadOptions(lookup, '', missing).then((r) => setKnown((k) => ({ ...k, ...Object.fromEntries(r.map((o) => [String(o.value), o.label])) })));
  }, [selected.join(','), lookup]); // eslint-disable-line
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    const t = setTimeout(() => loadOptions(lookup, q).then((r) => { if (!active) return; setOpts(r); setKnown((k) => ({ ...k, ...Object.fromEntries(r.map((o) => [String(o.value), o.label])) })); setLoading(false); }), q ? 200 : 0);
    return () => { active = false; clearTimeout(t); };
  }, [open, q, lookup]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const pick = (v: string) => {
    if (multi) onChange((selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]).join(','));
    else { onChange(v); setOpen(false); }
  };
  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} className={clsx('input flex min-h-[38px] items-center justify-between gap-2 text-left', disabled && 'cursor-not-allowed')}>
        <span className="flex flex-1 flex-wrap gap-1">
          {!selected.length && <span className="text-slate2/70">{placeholder || 'Select…'}</span>}
          {multi ? selected.map((s) => <span key={s} className="chip">{known[s] ?? s}<L.X className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); pick(s); }} /></span>)
            : selected[0] && <span className="truncate">{known[selected[0]] ?? selected[0]}</span>}
        </span>
        <span className="flex items-center gap-1 text-slate2">
          {!!selected.length && !disabled && <L.X className="h-3.5 w-3.5 hover:text-navy" onClick={(e) => { e.stopPropagation(); onChange(''); }} />}
          <L.ChevronsUpDown className="h-3.5 w-3.5" />
        </span>
      </button>
      {open && (
        <div className="card absolute z-50 mt-1 w-full min-w-[220px] p-1.5">
          <div className="relative mb-1"><L.Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate2" />
            <input autoFocus className="input h-8 pl-8 text-xs" placeholder="Type to search…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="max-h-60 overflow-y-auto">
            {loading && <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate2"><Spinner className="h-3 w-3" /> Loading</div>}
            {!loading && !opts.length && <p className="px-3 py-2 text-xs text-slate2">No options</p>}
            {opts.map((o) => (
              <button type="button" key={o.value} onClick={() => pick(String(o.value))} className={clsx('flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm hover:bg-navy-50', selected.includes(String(o.value)) && 'bg-navy-50 font-semibold text-navy')}>
                <span className="truncate">{o.label || o.value}</span>{selected.includes(String(o.value)) && <L.Check className="h-3.5 w-3.5 text-teal-700" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RichText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState(false);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== (value || '')) ref.current.innerHTML = value || ''; }, [value, src]);
  const cmd = (c: string, v?: string) => { document.execCommand(c, false, v); onChange(ref.current?.innerHTML || ''); };
  const B = ({ c, v, i, t }: any) => <button type="button" title={t} className="rounded p-1.5 hover:bg-navy-50" onMouseDown={(e) => { e.preventDefault(); cmd(c, v); }}>{i}</button>;
  return (
    <div className="rounded-lg border border-[#D6DFF1] bg-white focus-within:border-navy">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[#E6EBF4] px-1.5 py-1 text-slate2">
        <B c="bold" i={<L.Bold className="h-3.5 w-3.5" />} t="Bold" /><B c="italic" i={<L.Italic className="h-3.5 w-3.5" />} t="Italic" /><B c="underline" i={<L.Underline className="h-3.5 w-3.5" />} t="Underline" />
        <B c="formatBlock" v="h3" i={<L.Heading className="h-3.5 w-3.5" />} t="Heading" /><B c="insertUnorderedList" i={<L.List className="h-3.5 w-3.5" />} t="Bullets" /><B c="insertOrderedList" i={<L.ListOrdered className="h-3.5 w-3.5" />} t="Numbers" />
        <button type="button" className="rounded p-1.5 hover:bg-navy-50" title="Link" onMouseDown={(e) => { e.preventDefault(); const u = prompt('Link address'); if (u) cmd('createLink', u); }}><L.Link className="h-3.5 w-3.5" /></button>
        <B c="removeFormat" i={<L.RemoveFormatting className="h-3.5 w-3.5" />} t="Clear formatting" />
        <button type="button" className={clsx('ml-auto rounded px-2 py-1 text-[11px] font-semibold', src && 'bg-navy-50 text-navy')} onClick={() => setSrc((s) => !s)}>HTML</button>
      </div>
      {src ? <textarea className="h-52 w-full resize-y rounded-b-lg p-3 font-mono text-xs focus:outline-none" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        : <div ref={ref} contentEditable suppressContentEditableWarning className="rich min-h-[140px] px-3 py-2 text-sm focus:outline-none" onInput={() => onChange(ref.current?.innerHTML || '')} />}
    </div>
  );
}

function FileField({ value, onChange, folder }: { value: string; onChange: (v: string) => void; folder: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const upload = async (f: File) => {
    setBusy(true); setErr('');
    const fd = new FormData(); fd.append('file', f); fd.append('folder', folder);
    try { const r = await api('/api/upload', { method: 'POST', body: fd }); onChange(r.path); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const url = fileUrl(value);
  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="btn-outline btn-sm cursor-pointer">{busy ? <Spinner className="h-3 w-3" /> : <L.Upload className="h-3.5 w-3.5" />} {value ? 'Replace' : 'Upload'}
          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>
        {value && (url ? <a href={url} target="_blank" className="truncate text-sm text-navy underline">{value.split('/').pop()}</a> : <span className="truncate text-sm text-slate2" title="Stored in the legacy uploads folder">{value}</span>)}
        {value && <button type="button" className="text-slate2 hover:text-red-600" onClick={() => onChange('')}><L.X className="h-3.5 w-3.5" /></button>}
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}

export function Field({ f, value, onChange, module }: { f: FieldMeta; value: any; onChange: (v: any) => void; module: string }) {
  const v = value ?? '';
  switch (f.kind) {
    case 'select': return <LookupSelect lookup={f.lookup!} value={v} onChange={onChange} />;
    case 'multiselect': return <LookupSelect lookup={f.lookup!} value={v} onChange={onChange} multi />;
    case 'enum': return <select className="input" value={v} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{f.enumValues?.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
    case 'bool': return (
      <button type="button" onClick={() => onChange(String(v) === '1' ? 0 : 1)} className={clsx('relative h-6 w-11 rounded-full transition', String(v) === '1' ? 'bg-teal' : 'bg-[#D6DFF1]')} aria-pressed={String(v) === '1'}>
        <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', String(v) === '1' ? 'left-[22px]' : 'left-0.5')} />
      </button>);
    case 'number': return <input type="number" step="any" className="input" value={v} onChange={(e) => onChange(e.target.value)} />;
    case 'date': return <input type="date" className="input" value={String(v).slice(0, 10)} onChange={(e) => onChange(e.target.value)} />;
    case 'datetime': return <input type="datetime-local" className="input" value={String(v).replace(' ', 'T').slice(0, 16)} onChange={(e) => onChange(e.target.value)} />;
    case 'textarea': return <textarea className="input min-h-[96px] resize-y" value={v} onChange={(e) => onChange(e.target.value)} />;
    case 'richtext': return <RichText value={v} onChange={onChange} />;
    case 'file': return <FileField value={v} onChange={onChange} folder={module} />;
    case 'email': return <input type="email" className="input" value={v} onChange={(e) => onChange(e.target.value)} maxLength={f.maxLength} />;
    case 'url': return <input type="url" className="input" value={v} onChange={(e) => onChange(e.target.value)} placeholder="https://" maxLength={f.maxLength} />;
    case 'phone': return <input type="tel" className="input" value={v} onChange={(e) => onChange(e.target.value)} maxLength={f.maxLength} />;
    default: return <input className="input" value={v} onChange={(e) => onChange(e.target.value)} maxLength={f.maxLength} />;
  }
}

export const wideKinds = new Set(['textarea', 'richtext']);
