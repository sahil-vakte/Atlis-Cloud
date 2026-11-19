'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import * as L from '@/components/icons';

export default function Job({ params }: { params: { id: string } }) {
  const [j, setJ] = useState<any>(null); const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(''); const [formErr, setFormErr] = useState('');
  useEffect(() => { fetch(`/api/public/jobs/${params.id}`).then(async (r) => (r.ok ? setJ(await r.json()) : setErr('This role is no longer open.'))); }, [params.id]);
  const apply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true); setFormErr('');
    const fd = new FormData(e.currentTarget); fd.append('jobId', params.id);
    const r = await fetch('/api/public/apply', { method: 'POST', body: fd }); const d = await r.json();
    r.ok ? setDone(d.message) : setFormErr(d.message); setBusy(false);
  };
  if (err) return <main className="mx-auto max-w-3xl px-6 py-16"><div className="card p-8 text-center">{err} <Link href="/careers" className="font-semibold text-navy underline">See open roles</Link></div></main>;
  if (!j) return <main className="mx-auto max-w-3xl px-6 py-16 text-center text-slate2">Loading…</main>;
  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_380px]">
      <article className="card p-7">
        <Link href="/careers" className="text-sm font-semibold text-slate2 hover:text-navy">← All roles</Link>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-navy">{j.title}</h1>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate2">{j.location && <span className="inline-flex items-center gap-1"><L.MapPin className="h-4 w-4" />{j.location}</span>}{j.duration && <span className="inline-flex items-center gap-1"><L.Clock className="h-4 w-4" />{j.duration}</span>}{j.workMode && <span>{j.workMode}</span>}{j.experience && <span>{j.experience}</span>}</p>
        {j.skillset && <div className="mt-5 flex flex-wrap gap-1.5">{String(j.skillset).split(/[,;]/).map((s: string) => s.trim()).filter(Boolean).slice(0, 20).map((s: string) => <span key={s} className="chip">{s}</span>)}</div>}
        <div className="rich mt-6 text-[15px] leading-relaxed" dangerouslySetInnerHTML={{ __html: String(j.jobDescription || j.summary || '').replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, '').replace(/\son\w+="[^"]*"/gi, '') }} />
      </article>
      <aside className="card h-fit p-6 lg:sticky lg:top-6">
        {done ? <div className="text-center"><L.CheckCircle2 className="mx-auto h-10 w-10 text-teal-700" /><p className="mt-3 font-semibold text-navy">{done}</p><p className="mt-1 text-sm text-slate2">A recruiter will be in touch if your experience is a match.</p></div> : (
          <form onSubmit={apply} className="space-y-3">
            <h2 className="text-lg font-bold text-navy">Apply for this role</h2>
            {formErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formErr}</p>}
            <div><label className="label">Full name</label><input name="name" required className="input" /></div>
            <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
            <div><label className="label">Phone</label><input name="phone" className="input" /></div>
            <div><label className="label">CV</label><input name="cv" type="file" required accept=".pdf,.doc,.docx,.rtf,.odt,.txt" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:font-semibold file:text-navy" /></div>
            <label className="flex items-start gap-2 text-xs text-slate2"><input name="consent" type="checkbox" required className="mt-0.5" /> I agree that my details will be stored and used to contact me about this and similar roles, in line with the privacy notice.</label>
            <button className="btn-primary w-full" disabled={busy}>{busy ? <L.Loader2 className="h-4 w-4 animate-spin" /> : <L.Send className="h-4 w-4" />} Submit application</button>
          </form>)}
      </aside>
    </main>
  );
}
