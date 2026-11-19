'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as L from '@/components/icons';
import clsx from 'clsx';

function Board() {
  const sp = useSearchParams(); const router = useRouter();
  const tech = sp.get('technology') || '';
  const [q, setQ] = useState(sp.get('q') || '');
  const [d, setD] = useState<any>(null);
  useEffect(() => { const t = setTimeout(() => fetch(`/api/public/jobs?technology=${encodeURIComponent(tech)}&q=${encodeURIComponent(q)}`).then((r) => r.json()).then(setD), 200); return () => clearTimeout(t); }, [tech, q]);
  return (
    <>
      <section className="bg-navy pb-16 pt-6">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Find your next role</h1>
          <p className="mt-2 text-lg text-[#B3C0DB]">Contract and permanent opportunities with leading organisations.</p>
          <div className="relative mt-6 max-w-2xl"><L.Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate2" />
            <input className="input h-14 rounded-2xl pl-12 text-base" placeholder="Job title, skill or location" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
      </section>
      <main className="mx-auto -mt-8 max-w-6xl px-6">
        {d?.technologies?.length > 0 && <div className="mb-5 flex flex-wrap gap-2">
          <button onClick={() => router.push('/careers')} className={clsx('rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-card', !tech ? 'bg-teal text-navy-900' : 'bg-white text-navy')}>All roles</button>
          {d.technologies.map((t: any) => <button key={t.slug || t.name} onClick={() => router.push(`/careers?technology=${encodeURIComponent(t.slug || t.name)}`)} className={clsx('rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-card', tech === (t.slug || t.name) ? 'bg-teal text-navy-900' : 'bg-white text-navy')}>{t.name} <span className="opacity-60">{t.jobs}</span></button>)}
        </div>}
        {!d ? <div className="card p-10 text-center text-slate2">Loading roles…</div> : !d.jobs.length ? <div className="card p-10 text-center text-slate2">No open roles match right now. Please check back soon.</div> : (
          <div className="grid gap-4 md:grid-cols-2">{d.jobs.map((j: any) => (
            <Link key={j.id} href={`/careers/${j.id}`} className="card block p-5 transition hover:-translate-y-0.5 hover:border-navy">
              <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-bold text-navy">{j.title}</h2>{j.technology && <span className="badge bg-navy-50 text-navy">{j.technology}</span>}</div>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate2">{(j.location || j.city) && <span className="inline-flex items-center gap-1"><L.MapPin className="h-3.5 w-3.5" />{j.location || j.city}</span>}{j.duration && <span className="inline-flex items-center gap-1"><L.Clock className="h-3.5 w-3.5" />{j.duration}</span>}{j.workMode && <span>{j.workMode}</span>}{j.jobType && <span>{j.jobType}</span>}</p>
              {j.skillset && <p className="mt-3 line-clamp-2 text-sm">{String(j.skillset).replace(/<[^>]+>/g, ' ')}</p>}
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy">View & apply <L.ArrowRight className="h-4 w-4" /></span>
            </Link>))}</div>
        )}
      </main>
    </>
  );
}
export default function Page() { return <Suspense><Board /></Suspense>; }
