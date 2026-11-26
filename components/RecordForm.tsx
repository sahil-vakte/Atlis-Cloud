'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import * as L from './icons';
import clsx from 'clsx';
import { api } from '@/lib/client';
import { Field, wideKinds } from './fields';
import { loadMeta, type Meta } from './DataTable';
import { Loading, Modal, PageHeader, Spinner, useToast } from './ui';

export default function RecordForm({ module, id }: { module: string; id?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [jdOpen, setJdOpen] = useState(false);

  useEffect(() => {
    loadMeta(module).then(async (m) => {
      setMeta(m);
      if (id) setValues(await api(`/api/m/${module}/${id}`));
      else {
        const init: Record<string, any> = { ...m.defaults };
        sp.forEach((v, k) => { init[k] = v; });
        setValues(init);
      }
    }).catch((e) => setError(e.message));
  }, [module, id]); // eslint-disable-line

  if (error && !meta) return <div className="card p-6 text-sm text-red-700">{error}</div>;
  if (!meta) return <Loading />;
  const byName = Object.fromEntries(meta.fields.map((f: any) => [f.name, f]));
  const set = (k: string, v: any) => setValues((x) => ({ ...x, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (module === 'profiles' && !id && (typeof values.name !== 'string' || !values.name.trim() || /^null$/i.test(values.name.trim()))) {
      setError('Enter a name before saving the profile.');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload: Record<string, any> = {};
      for (const f of meta.fields) if (f.name in values) payload[f.name] = values[f.name];
      if (id) { await api(`/api/m/${module}/${id}`, { method: 'PUT', json: payload }); toast('success', `${meta.singular} saved`); router.push(`/m/${module}/${id}`); }
      else { const r = await api(`/api/m/${module}`, { method: 'POST', json: payload }); toast('success', `${meta.singular} created`); router.push(`/m/${module}/${r.id}`); }
      router.refresh();
    } catch (err: any) { setError(err.message); toast('error', err.message); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit}>
      <PageHeader crumbs={<Link href={`/m/${module}`} className="hover:underline">{meta.label}</Link>} title={id ? `Edit ${meta.singular.toLowerCase()}` : `New ${meta.singular.toLowerCase()}`}
        sub={id ? `${values[meta.titleField] || ''} · #${id}` : undefined}
        actions={<>
          {module === 'requirements' && !id && <button type="button" className="btn-outline" onClick={() => setJdOpen(true)}><L.Sparkles className="h-4 w-4 text-teal-700" /> Fill from job description</button>}
          {module === 'profiles' && !id && <Link href="/cv-parser" className="btn-outline"><L.ScanText className="h-4 w-4 text-teal-700" /> Create from CV instead</Link>}
          <Link href={id ? `/m/${module}/${id}` : `/m/${module}`} className="btn-outline">Cancel</Link>
          <button className="btn-primary" disabled={saving}>{saving ? <Spinner /> : <L.Save className="h-4 w-4" />} Save</button>
        </>} />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="space-y-5">
        {meta.sections.map((s) => (
          <section key={s.title} className="card p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate2">{s.title}</h2>
            <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {s.fields.map((n) => {
                const f = byName[n]; if (!f) return null;
                return (
                  <div key={n} className={clsx(wideKinds.has(f.kind) && 'sm:col-span-2 xl:col-span-3', f.kind === 'bool' && 'flex items-center justify-between gap-3 rounded-lg border border-[#E6EBF4] px-3 py-2')}>
                    <label className={clsx('label', f.kind === 'bool' && 'mb-0')}>{f.label}{f.required && <span className="text-red-600"> *</span>}</label>
                    <Field f={f} value={values[n]} onChange={(v) => set(n, v)} module={module} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t border-[#E6EBF4] bg-[#F4F6FB]/95 py-3 backdrop-blur">
        <Link href={id ? `/m/${module}/${id}` : `/m/${module}`} className="btn-outline">Cancel</Link>
        <button className="btn-primary" disabled={saving}>{saving ? <Spinner /> : <L.Save className="h-4 w-4" />} Save {meta.singular.toLowerCase()}</button>
      </div>
      {module === 'requirements' && <JdModal open={jdOpen} onClose={() => setJdOpen(false)} onApply={(v) => setValues((x) => ({ ...x, ...v }))} />}
    </form>
  );
}

function JdModal({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (v: Record<string, any>) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const run = async (file?: File) => {
    setBusy(true);
    try {
      let r;
      if (file) { const fd = new FormData(); fd.append('file', file); r = await api('/api/workflow/parse-jd', { method: 'POST', body: fd }); }
      else r = await api('/api/workflow/parse-jd', { method: 'POST', json: { text } });
      const opt = async (lookup: string, label: string) => {
        if (!label) return undefined;
        const o = await api<any[]>(`/api/lookup/${lookup}`); return o.find((x) => x.label.toLowerCase() === label.toLowerCase())?.value;
      };
      onApply({ roleName: r.roleName, location: r.location, skillset: r.skillset, jobDescription: r.jobDescription.replace(/\n/g, '<br>'), experience: r.experience, openPositions: r.openPositions,
        jobType: await opt('reqType', r.jobType), workMode: await opt('opt:work_mode', r.workMode), additionalNotes: [r.rate && `Rate: ${r.rate}`, r.duration && `Duration: ${r.duration}`, r.ir35 && r.ir35].filter(Boolean).join(' · ') });
      toast('success', 'Fields filled from the job description. Check them before saving.'); onClose();
    } catch (e: any) { toast('error', e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Fill from a job description" wide
      footer={<><label className="btn-outline cursor-pointer"><L.Upload className="h-4 w-4" /> Upload JD file<input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.rtf" onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} /></label>
        <button className="btn-primary" disabled={busy || text.trim().length < 20} onClick={() => run()}>{busy ? <Spinner /> : <L.Sparkles className="h-4 w-4" />} Extract fields</button></>}>
      <p className="mb-3 text-sm text-slate2">Paste the client's job description. atlis.cloud picks out the role, location, skills, experience, job type, working pattern, rate and duration.</p>
      <textarea className="input min-h-[260px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the job description here…" />
    </Modal>
  );
}
