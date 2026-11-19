'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import * as L from '@/components/icons';
import clsx from 'clsx';
import { api } from '@/lib/client';
import { LookupSelect } from '@/components/fields';
import { PageHeader, Spinner, useToast } from '@/components/ui';

type Result = { fileName: string; ok: boolean; error?: string; file?: string; method?: string; durationMs?: number; duplicates?: any[]; data?: any; state?: 'idle' | 'saving' | 'saved' | 'error'; profileId?: number; msg?: string };
const ACCEPT = '.pdf,.doc,.docx,.rtf,.odt,.txt,.htm,.html,.png,.jpg,.jpeg,.webp,.tif,.tiff';

export default function CvParser() {
  const toast = useToast();
  const [items, setItems] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [drag, setDrag] = useState(false);
  const [requirement, setRequirement] = useState('');
  const [owner, setOwner] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const parse = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true); setProgress({ done: 0, total: files.length });
    // send in small batches so progress is visible and a slow OCR file doesn't hold up the rest
    for (let i = 0; i < files.length; i += 3) {
      const fd = new FormData(); files.slice(i, i + 3).forEach((f) => fd.append('files', f));
      try { const r = await api<{ results: Result[] }>('/api/cv/parse', { method: 'POST', body: fd }); setItems((a) => [...r.results.map((x) => ({ ...x, state: 'idle' as const })), ...a]); }
      catch (e: any) { toast('error', e.message); }
      setProgress((p) => ({ ...p, done: Math.min(p.total, i + 3) }));
    }
    setBusy(false);
  };
  const update = (idx: number, patch: Partial<Result>) => setItems((a) => a.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const setData = (idx: number, k: string, v: any) => setItems((a) => a.map((x, i) => (i === idx ? { ...x, data: { ...x.data, [k]: v } } : x)));

  const create = async (idx: number, allowDuplicate = false) => {
    const it = items[idx]; if (!it.data) return;
    update(idx, { state: 'saving' });
    try {
      const overrides: any = { name: it.data.name };
      if (owner) overrides.assignedUserID = owner;
      const r = await api('/api/cv/create-profile', { method: 'POST', json: { data: it.data, file: it.file, overrides, allowDuplicate } });
      if (requirement) await api(`/api/workflow/requirements/${requirement}/add-profiles`, { method: 'POST', json: { profileIds: [r.profileId] } });
      update(idx, { state: 'saved', profileId: r.profileId, msg: requirement ? 'Profile created and added to sourcing' : 'Profile created' });
    } catch (e: any) { update(idx, { state: 'error', msg: e.message }); }
  };
  const createAll = async () => { for (let i = 0; i < items.length; i++) if (items[i].ok && items[i].state !== 'saved' && !items[i].duplicates?.length) await create(i); toast('success', 'Finished creating profiles'); };
  const pending = items.filter((x) => x.ok && x.state !== 'saved').length;

  return (
    <>
      <PageHeader title="CV Parser" sub="Drop in CVs and atlis.cloud reads them on your own server — no outside service, no per-CV charges." actions={pending > 1 && <button className="btn-primary" onClick={createAll}><L.UsersRound className="h-4 w-4" /> Create {pending} profiles</button>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); parse([...e.dataTransfer.files]); }}
          onClick={() => !busy && input.current?.click()} className={clsx('card flex cursor-pointer flex-col items-center justify-center border-2 border-dashed px-6 py-12 text-center transition', drag ? 'border-teal bg-teal-50' : 'border-[#C9D3E6] hover:border-navy')}>
          <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { parse([...(e.target.files || [])]); e.target.value = ''; }} />
          {busy ? <><Spinner className="h-8 w-8 text-navy" /><p className="mt-3 font-semibold text-navy">Reading CVs… {progress.done}/{progress.total}</p><div className="mt-3 h-1.5 w-64 overflow-hidden rounded-full bg-navy-50"><div className="h-full bg-teal transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div></>
            : <><div className="grid h-14 w-14 place-items-center rounded-2xl bg-navy text-teal"><L.UploadCloud className="h-7 w-7" /></div>
              <p className="mt-4 text-lg font-bold text-navy">Drop CVs here, or click to choose</p>
              <p className="mt-1 text-sm text-slate2">PDF (including scanned), Word .docx and .doc, RTF, ODT, text and photos of CVs · up to 50 at a time</p></>}
        </div>
        <div className="card space-y-4 p-5">
          <h3 className="text-sm font-bold text-navy">When creating profiles</h3>
          <div><label className="label">Assign to recruiter</label><LookupSelect lookup="recruiter" value={owner} onChange={setOwner} placeholder="Me" /></div>
          <div><label className="label">Also add to requirement</label><LookupSelect lookup="requirement" value={requirement} onChange={setRequirement} placeholder="Don't add" /></div>
          <p className="text-xs text-slate2">Profiles that match an existing email or phone number are flagged so you don't create duplicates.</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {items.map((it, idx) => <ResultCard key={idx + it.fileName} it={it} onChange={(k, v) => setData(idx, k, v)} onCreate={(dup) => create(idx, dup)} onRemove={() => setItems((a) => a.filter((_, i) => i !== idx))} />)}
      </div>
    </>
  );
}

function Conf({ v }: { v: number }) {
  const c = v >= 85 ? 'bg-teal-50 text-teal-700' : v >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
  return <span className={`badge ${c}`}>{v}%</span>;
}

function ResultCard({ it, onChange, onCreate, onRemove }: { it: Result; onChange: (k: string, v: any) => void; onCreate: (dup: boolean) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const [skill, setSkill] = useState('');
  if (!it.ok) return (
    <div className="card flex items-center gap-3 border-red-200 p-4 text-sm"><L.FileX className="h-5 w-5 text-red-600" /><b>{it.fileName}</b><span className="text-red-700">{it.error}</span><button className="btn-ghost btn-sm ml-auto" onClick={onRemove}><L.X className="h-4 w-4" /></button></div>
  );
  const d = it.data;
  const phone = d.phones?.[0];
  return (
    <div className={clsx('card overflow-hidden', it.state === 'saved' && 'border-teal/50')}>
      <div className="flex flex-wrap items-center gap-3 border-b border-[#E6EBF4] bg-[#F8FAFD] px-5 py-3">
        <L.FileText className="h-4 w-4 text-slate2" /><span className="text-sm font-semibold text-navy">{it.fileName}</span>
        <span className="text-xs text-slate2">{it.method} · {((it.durationMs || 0) / 1000).toFixed(1)}s</span>
        <span className="text-xs text-slate2">Confidence</span><Conf v={d.confidence.overall} />
        <div className="ml-auto flex items-center gap-2">
          {it.state === 'saved' ? <Link href={`/m/profiles/${it.profileId}`} className="btn-accent btn-sm"><L.CheckCircle2 className="h-4 w-4" /> Open profile P{it.profileId}</Link>
            : <button className="btn-primary btn-sm" disabled={it.state === 'saving'} onClick={() => onCreate(!!it.duplicates?.length)}>{it.state === 'saving' ? <Spinner className="h-3 w-3" /> : <L.UserPlus className="h-4 w-4" />} {it.duplicates?.length ? 'Create anyway' : 'Create profile'}</button>}
          <button className="btn-ghost btn-sm" onClick={onRemove} aria-label="Remove"><L.X className="h-4 w-4" /></button>
        </div>
      </div>
      {(it.duplicates?.length || it.msg || d.warnings?.length) ? (
        <div className="space-y-1 px-5 pt-3 text-sm">
          {it.duplicates?.map((p) => <p key={p.pID} className="flex items-center gap-2 text-amber-700"><L.Copy className="h-4 w-4" /> Possible duplicate: <Link href={`/m/profiles/${p.pID}`} className="font-semibold underline">{p.name} (P{p.pID})</Link> · {p.primaryEmail}</p>)}
          {it.msg && <p className={it.state === 'error' ? 'text-red-700' : 'text-teal-700'}>{it.msg}</p>}
          {d.warnings?.map((w: string) => <p key={w} className="flex items-center gap-2 text-xs text-slate2"><L.Info className="h-3.5 w-3.5" />{w}</p>)}
        </div>
      ) : null}
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <div><label className="label">Name <Conf v={d.confidence.name} /></label><input className="input" value={d.name} onChange={(e) => onChange('name', e.target.value)} /></div>
        <div><label className="label">Email</label><input className="input" value={d.emails[0] || ''} onChange={(e) => onChange('emails', [e.target.value, ...d.emails.slice(1)])} /></div>
        <div><label className="label">Phone</label><input className="input" value={phone?.e164 || ''} onChange={(e) => onChange('phones', [{ ...(phone || {}), e164: e.target.value, national: e.target.value, callingCode: phone?.callingCode || '' }, ...(d.phones || []).slice(1)])} /></div>
        <div><label className="label">Location</label><input className="input" value={d.location.formatted} onChange={(e) => onChange('location', { ...d.location, formatted: e.target.value })} /></div>
        <div><label className="label">Current role</label><input className="input" value={d.designation} onChange={(e) => onChange('designation', e.target.value)} /></div>
        <div><label className="label">Current employer</label><input className="input" value={d.currentCompany} onChange={(e) => onChange('currentCompany', e.target.value)} /></div>
        <div><label className="label">Total experience (years)</label><input className="input" type="number" step="0.1" value={d.totalYearsExperience ?? ''} onChange={(e) => onChange('totalYearsExperience', e.target.value === '' ? null : Number(e.target.value))} /></div>
        <div><label className="label">LinkedIn</label><input className="input" value={d.linkedin} onChange={(e) => onChange('linkedin', e.target.value)} /></div>
        <div className="md:col-span-2 xl:col-span-4">
          <label className="label">Skills ({d.skills.length})</label>
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-[#D6DFF1] p-2">
            {d.skills.map((s: string) => <span key={s} className="chip">{s}<L.X className="h-3 w-3 cursor-pointer" onClick={() => onChange('skills', d.skills.filter((x: string) => x !== s))} /></span>)}
            <input className="min-w-[120px] flex-1 text-sm focus:outline-none" placeholder="Add skill…" value={skill} onChange={(e) => setSkill(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && skill.trim()) { e.preventDefault(); onChange('skills', [...d.skills, skill.trim()]); setSkill(''); } }} />
          </div>
        </div>
      </div>
      <button className="flex w-full items-center gap-2 border-t border-[#E6EBF4] px-5 py-2.5 text-xs font-semibold text-navy hover:bg-[#F8FAFD]" onClick={() => setOpen((o) => !o)}>
        {open ? <L.ChevronUp className="h-4 w-4" /> : <L.ChevronDown className="h-4 w-4" />} Work history ({d.workExperience.length}), education ({d.education.length}), certifications, languages and summary
      </button>
      {open && (
        <div className="grid gap-5 border-t border-[#E6EBF4] p-5 lg:grid-cols-2">
          <div>
            <h4 className="label">Work history</h4>
            <ol className="space-y-3">{d.workExperience.map((w: any, i: number) => (
              <li key={i} className="rounded-xl border border-[#E6EBF4] p-3 text-sm"><p className="font-semibold text-navy">{w.title || '—'}</p><p className="text-slate2">{w.company}{w.location ? ` · ${w.location}` : ''}</p>
                <p className="mt-0.5 text-xs text-slate2">{w.startDate} → {w.current ? 'present' : w.endDate} · {Math.round(w.months / 12 * 10) / 10} yrs</p>
                {w.description && <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-xs">{w.description}</p>}</li>))}
              {!d.workExperience.length && <p className="text-sm text-slate2">No dated roles found.</p>}</ol>
          </div>
          <div className="space-y-5">
            <div><h4 className="label">Education</h4>{d.education.map((e: any, i: number) => <p key={i} className="py-1 text-sm"><b>{e.degree}</b>{e.field && ` in ${e.field}`}{e.institution && ` — ${e.institution}`}{e.year && ` (${e.year})`}{e.grade && ` · ${e.grade}`}</p>)}{!d.education.length && <p className="text-sm text-slate2">None found.</p>}</div>
            {!!d.certifications.length && <div><h4 className="label">Certifications</h4><ul className="list-disc pl-5 text-sm">{d.certifications.map((c: string) => <li key={c}>{c}</li>)}</ul></div>}
            {!!d.languages.length && <div><h4 className="label">Languages</h4><p className="text-sm">{d.languages.join(', ')}</p></div>}
            {(d.nationality || d.noticePeriod || d.dob || d.workAuthorisation) && <div><h4 className="label">Personal</h4><p className="text-sm">{[d.nationality && `Nationality: ${d.nationality}`, d.noticePeriod && `Notice: ${d.noticePeriod}`, d.workAuthorisation && `Right to work: ${d.workAuthorisation}`, d.dob && `DOB: ${d.dob}`].filter(Boolean).join(' · ')}</p></div>}
            {d.summary && <div><h4 className="label">Summary</h4><textarea className="input min-h-[110px] text-sm" value={d.summary} onChange={(e) => onChange('summary', e.target.value)} /></div>}
          </div>
        </div>
      )}
    </div>
  );
}
