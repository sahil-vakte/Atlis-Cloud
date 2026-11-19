'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import * as L from '@/components/icons';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, fmtDate } from '@/lib/client';
import { Loading, PageHeader, StatusBadge } from '@/components/ui';

const C = { navy: '#00297B', slate: '#576E9A', teal: '#01E2C1', light: '#B3C0DB' };
const PIE = ['#00297B', '#01E2C1', '#576E9A', '#B3C0DB', '#00B89D', '#8A9BBF'];
const tip = { contentStyle: { borderRadius: 12, border: '1px solid #E6EBF4', fontSize: 12 } };

function Kpi({ label, value, icon, href, accent }: { label: string; value: number; icon: React.ReactNode; href?: string; accent?: boolean }) {
  const body = (
    <div className={`card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 ${accent ? 'bg-navy text-white' : ''}`}>
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${accent ? 'bg-teal text-navy-900' : 'bg-navy-50 text-navy'}`}>{icon}</div>
      <div><p className={`text-2xl font-extrabold tracking-tight ${accent ? 'text-white' : 'text-navy'}`}>{value.toLocaleString()}</p><p className={`text-xs font-medium ${accent ? 'text-[#B3C0DB]' : 'text-slate2'}`}>{label}</p></div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
const Card = ({ title, children, action }: any) => <div className="card p-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-navy">{title}</h3>{action}</div>{children}</div>;

export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/dashboard').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="card p-6 text-sm text-red-700">{err}</div>;
  if (!d) return <Loading label="Loading dashboard…" />;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const banners = d.banners?.length ? <div className="mb-5 space-y-2">{d.banners.map((b: any) => <div key={b.id} className="flex items-center gap-3 rounded-xl border border-teal/40 bg-teal-50 px-4 py-3 text-sm text-navy"><L.Megaphone className="h-4 w-4 text-teal-700" />{b.title}</div>)}</div> : null;

  if (d.kind === 'portal') return (
    <>
      <PageHeader title={`${greet}`} sub="Your engagements, timesheets and invoices at a glance." />
      {banners}
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Engagements" value={d.consultants.length} icon={<L.Handshake className="h-5 w-5" />} href="/m/consultants" accent />
        <Kpi label="Timesheets" value={d.timesheets.reduce((a: number, x: any) => a + Number(x.value), 0)} icon={<L.CalendarDays className="h-5 w-5" />} href="/m/timesheets" />
        <Kpi label="Invoices" value={d.invoices.reduce((a: number, x: any) => a + Number(x.value), 0)} icon={<L.Receipt className="h-5 w-5" />} href="/m/invoices" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Engagements">{d.consultants.length ? <div className="divide-y divide-[#EEF2F8]">{d.consultants.map((c: any) => <Link key={c.cdID} href={`/m/consultants/${c.cdID}`} className="flex items-center justify-between py-2.5 text-sm hover:text-navy"><span><b>{c.candidateName}</b> · {c.role}</span><span className="text-xs text-slate2">{c.endClient} · {fmtDate(c.startDate)}–{fmtDate(c.endDate) || 'ongoing'}</span></Link>)}</div> : <p className="text-sm text-slate2">No engagements yet.</p>}</Card>
        <Card title="Status overview">
          <div className="grid grid-cols-3 gap-3 text-center text-sm">{[['Timesheets', d.timesheets], ['Invoices', d.invoices], ['Expenses', d.expenses]].map(([t, arr]: any) => (
            <div key={t} className="rounded-xl bg-[#F8FAFD] p-3"><p className="mb-2 text-xs font-bold uppercase text-slate2">{t}</p>{arr.length ? arr.map((x: any) => <div key={x.label} className="flex justify-between py-0.5"><StatusBadge value={x.label} /><b>{x.value}</b></div>) : <p className="text-xs text-slate2">None</p>}</div>))}</div>
        </Card>
        <Card title="Latest updates">{d.updates.length ? d.updates.map((u: any) => <div key={u.updateID} className="border-b border-[#EEF2F8] py-2 last:border-0"><p className="text-sm font-semibold text-navy">{u.updateName}</p><p className="text-xs text-slate2">{fmtDate(u.updateDate)}</p></div>) : <p className="text-sm text-slate2">No updates.</p>}</Card>
      </div>
    </>
  );

  const k = d.kpis;
  const months = d.months.map((m: any) => ({ ...m, label: new Date(m.m + '-01').toLocaleDateString('en-GB', { month: 'short' }), requirements: Number(m.requirements), profiles: Number(m.profiles), submissions: Number(m.submissions) }));
  return (
    <>
      <PageHeader title={greet} sub="Here's how recruitment and consultant care are tracking." actions={<><Link href="/cv-parser" className="btn-accent"><L.ScanText className="h-4 w-4" /> Parse CVs</Link><Link href="/m/requirements/new" className="btn-primary"><L.Plus className="h-4 w-4" /> New requirement</Link></>} />
      {banners}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Open requirements" value={k.openReqs} icon={<L.ClipboardList className="h-5 w-5" />} href="/m/requirements" accent />
        <Kpi label="Profiles" value={k.profiles} icon={<L.UserRound className="h-5 w-5" />} href="/m/profiles" />
        <Kpi label="Submissions" value={k.submissions} icon={<L.Send className="h-5 w-5" />} href="/m/submissions" />
        <Kpi label="Sent to clients" value={k.sentToClient} icon={<L.Mail className="h-5 w-5" />} href="/m/pipeline" />
        <Kpi label="Active consultants" value={k.activeConsultants} icon={<L.Handshake className="h-5 w-5" />} href="/m/consultants" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Kpi label="Timesheets awaiting approval" value={k.pendingTimesheets} icon={<L.CalendarClock className="h-5 w-5" />} href="/m/timesheets" />
        <Kpi label="Invoices awaiting approval" value={k.pendingInvoices} icon={<L.ReceiptText className="h-5 w-5" />} href="/m/invoices" />
        <Kpi label="CRM prospects" value={k.prospects} icon={<L.Target className="h-5 w-5" />} href="/m/crm-prospects" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2"><Card title="Last 12 months">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={months} margin={{ left: -18, right: 8, top: 8 }}>
              <defs>{[['g1', C.navy], ['g2', C.teal], ['g3', C.slate]].map(([id, c]) => <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={0.25} /><stop offset="100%" stopColor={c} stopOpacity={0} /></linearGradient>)}</defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F8" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} />
              <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="profiles" name="Profiles" stroke={C.slate} fill="url(#g3)" strokeWidth={2} />
              <Area type="monotone" dataKey="submissions" name="Submissions" stroke={C.teal} fill="url(#g2)" strokeWidth={2} />
              <Area type="monotone" dataKey="requirements" name="Requirements" stroke={C.navy} fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer></Card></div>
        <Card title="Submission pipeline">
          {d.pipeline.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={d.pipeline.map((x: any) => ({ ...x, value: Number(x.value) }))} layout="vertical" margin={{ left: 10, right: 16 }}>
            <XAxis type="number" hide /><YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} /><Tooltip {...tip} />
            <Bar dataKey="value" name="Candidates" fill={C.navy} radius={[0, 6, 6, 0]} barSize={14} /></BarChart></ResponsiveContainer> : <p className="py-10 text-center text-sm text-slate2">No submissions yet.</p>}
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card title="Recruiter activity · last 90 days" action={<Link href="/reports" className="text-xs font-semibold text-navy hover:underline">Full report</Link>}>
          <table className="w-full text-sm"><thead><tr className="text-left text-[11px] uppercase text-slate2"><th className="pb-2">Recruiter</th><th className="pb-2 text-right">Sourced</th><th className="pb-2 text-right">Submitted</th><th className="pb-2 text-right">Sent</th></tr></thead>
            <tbody>{d.recruiters.map((r: any) => <tr key={r.label} className="border-t border-[#EEF2F8]"><td className="py-2 font-medium text-navy">{r.label}</td><td className="py-2 text-right">{r.sourced}</td><td className="py-2 text-right">{Number(r.submitted)}</td><td className="py-2 text-right">{Number(r.sent)}</td></tr>)}
              {!d.recruiters.length && <tr><td colSpan={4} className="py-6 text-center text-slate2">No activity in the last 90 days.</td></tr>}</tbody></table>
        </Card>
        <Card title="Top clients by requirements">
          <ResponsiveContainer width="100%" height={240}><BarChart data={d.topClients.map((x: any) => ({ ...x, value: Number(x.value) }))} margin={{ left: -18 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.slate }} interval={0} angle={-25} textAnchor="end" height={60} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} /><Tooltip {...tip} />
            <Bar dataKey="value" name="Requirements" fill={C.teal} radius={[6, 6, 0, 0]} barSize={22} /></BarChart></ResponsiveContainer>
        </Card>
        <Card title="Timesheets & invoices">
          <div className="grid grid-cols-2">{[['Timesheets', d.timesheets], ['Invoices', d.invoices]].map(([t, arr]: any) => (
            <div key={t}><p className="text-center text-xs font-bold uppercase text-slate2">{t}</p>
              <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={arr.map((x: any) => ({ ...x, value: Number(x.value) }))} dataKey="value" nameKey="label" innerRadius={42} outerRadius={70} paddingAngle={2}>
                {arr.map((_: any, i: number) => <Cell key={i} fill={PIE[i % PIE.length]} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></div>))}</div>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Newest requirements" action={<Link href="/m/requirements" className="text-xs font-semibold text-navy hover:underline">View all</Link>}>
          <div className="divide-y divide-[#EEF2F8]">{d.recentReqs.map((r: any) => <Link key={r.rID} href={`/m/requirements/${r.rID}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-navy"><span className="font-semibold text-navy">{r.roleName}</span><span className="text-right text-xs text-slate2">{r.clientName}{r.location ? ` · ${r.location}` : ''} · {fmtDate(r.created_at)}</span></Link>)}</div>
        </Card>
        <Card title="Latest submissions" action={<Link href="/m/submissions" className="text-xs font-semibold text-navy hover:underline">View all</Link>}>
          <div className="divide-y divide-[#EEF2F8]">{d.recentSubs.map((s: any) => <Link key={s.sID} href={`/m/submissions/${s.sID}`} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span><b className="text-navy">{s.candidate || s.sourcingName}</b> <span className="text-slate2">for {s.roleName}</span></span><StatusBadge value={s.profileStatus} /></Link>)}
            {!d.recentSubs.length && <p className="py-6 text-center text-sm text-slate2">No submissions yet.</p>}</div>
        </Card>
      </div>
    </>
  );
}
