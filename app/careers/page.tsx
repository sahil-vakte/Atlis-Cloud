'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, MapPin, Clock3, BriefcaseBusiness, SlidersHorizontal, SearchX, RefreshCw, Layers3 } from 'lucide-react';
type Job = { id: number; title: string; technology?: string; location?: string; city?: string; duration?: string; workMode?: string; jobType?: string; skillset?: string };
type BoardData = { jobs: Job[]; technologies: { slug: string; name: string; jobs: number }[] };
function Board() {
  const sp = useSearchParams(), router = useRouter(), tech = sp.get('technology') || '';
  const [q, setQ] = useState(sp.get('q') || ''), [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const timer = setTimeout(async () => { try {
      const r = await fetch(`/api/public/jobs?technology=${encodeURIComponent(tech)}&q=${encodeURIComponent(q)}`, { signal: controller.signal });
      if (!r.ok) throw new Error('We could not load opportunities. Please try again.');
      setData(await r.json()); setLoading(false);
    } catch (e) { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : 'Unable to connect.'); setLoading(false); } } }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [tech, q, retry]);
  const selectTech = (value: string) => { const params = new URLSearchParams(); if (value) params.set('technology', value); if (q) params.set('q', q); router.replace('/careers' + (params.size ? '?' + params : ''), { scroll: false }); };
  const clear = () => { setQ(''); router.replace('/careers', { scroll: false }); };
  return <main>
    <section className="jobs-hero"><div className="ac-wrap jobs-hero-grid"><div><p className="ac-eyebrow">YOUR EXPERIENCE. YOUR AMBITION. YOUR NEXT CHAPTER.</p><h1>Good work starts<br />with the <em>right role.</em></h1><p>Explore opportunities that put your skills to work. Find a new challenge, build on what you know, and discover what comes next.</p></div><div className="jobs-hero-art" aria-hidden="true"><div className="job-art-ring" /><BriefcaseBusiness size={62} strokeWidth={1.2} /><span>Make your next move.</span><div className="job-art-label"><Layers3 size={18} /> A place for your potential</div></div></div></section>
    <section className="ac-wrap jobs-board" aria-label="Find open roles">
      <div className="jobs-search"><Search size={23} aria-hidden="true" /><label htmlFor="job-search" className="sr-only">Search by job title, skill or location</label><input id="job-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Job title, skill or location" type="search" /><span>Find your next opportunity</span></div>
      <div className="jobs-layout"><aside className="jobs-filters"><div className="filter-title"><SlidersHorizontal size={18} /><h2>Find your focus</h2></div><p>Explore by specialism</p><div className="technology-list"><button aria-pressed={!tech} className={!tech ? 'selected' : ''} onClick={() => selectTech('')}>All opportunities</button>{data?.technologies.map(t => <button key={t.slug || t.name} aria-pressed={tech === (t.slug || t.name)} className={tech === (t.slug || t.name) ? 'selected' : ''} onClick={() => selectTech(t.slug || t.name)}><span>{t.name}</span><span>{t.jobs}</span></button>)}</div>{(q || tech) && <button className="filter-clear" onClick={clear}>Clear filters</button>}<div className="career-tip"><BriefcaseBusiness size={25} /><h3>Your next step matters.</h3><p>Take a closer look at a role to explore the details and send your CV.</p></div></aside>
      <div><div className="jobs-results-heading"><div><p className="ac-eyebrow">EXPLORE THE POSSIBILITIES</p><h2>Open opportunities</h2></div><span aria-live="polite">{loading ? 'Searching…' : error ? 'Try again' : `${data?.jobs.length || 0} roles found`}</span></div>
      {error ? <div className="jobs-empty" role="alert"><RefreshCw size={34} /><h3>Let’s try that again.</h3><p>{error}</p><button className="ac-button" onClick={() => setRetry(v => v + 1)}>Reload opportunities</button></div> : loading ? <div aria-busy="true" aria-label="Loading opportunities" className="job-skeletons">{[1,2,3].map(n => <div key={n} className="job-skeleton"><div /><div /><div /></div>)}</div> : !data?.jobs.length ? <div className="jobs-empty"><SearchX size={38} /><h3>{q || tech ? 'A different search could open a door.' : 'Your next opportunity is on its way.'}</h3><p>{q || tech ? 'Try another skill, a broader location, or explore all our current opportunities.' : 'There are no published roles right now. Check back soon for new opportunities.'}</p>{(q || tech) && <button className="ac-button" onClick={clear}>See all roles</button>}</div> : <div className="job-list">{data.jobs.map(j => <Link className="job-card" href={`/careers/${j.id}`} key={j.id}><div className="job-card-top"><span className="job-category">{j.technology || 'Career opportunity'}</span>{j.jobType && <span className="job-type">{j.jobType}</span>}</div><h3>{j.title}</h3><div className="job-meta">{(j.location || j.city) && <span><MapPin size={15} />{j.location || j.city}</span>}{j.duration && <span><Clock3 size={15} />{j.duration}</span>}{j.workMode && <span><BriefcaseBusiness size={15} />{j.workMode}</span>}</div><div className="job-card-bottom"><div className="skill-tags">{String(j.skillset || '').replace(/<[^>]*>/g, ' ').split(/[,;]/).map(s => s.trim()).filter(Boolean).slice(0,3).map((s,i) => <span key={i}>{s}</span>)}</div><span className="job-view">View role & apply</span></div></Link>)}</div>}
      </div></div>
    </section><section className="career-bottom ac-wrap"><div><p className="ac-eyebrow">MORE THAN A JOB SEARCH</p><h2>A clear next step.<br />A new possibility.</h2></div><p>Every career takes its own path. Explore the details, see where your experience fits, and apply when you find the right opportunity.</p></section>
  </main>;
}
export default function Page() { return <Suspense fallback={<div className="jobs-empty">Loading opportunities…</div>}><Board /></Suspense>; }
