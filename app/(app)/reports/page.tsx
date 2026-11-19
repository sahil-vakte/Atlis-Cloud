'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import * as L from '@/components/icons';
import clsx from 'clsx';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, qs, fmtDate } from '@/lib/client';
import { LookupSelect } from '@/components/fields';
import { Loading, PageHeader } from '@/components/ui';

const TABS = [['recruiter', 'Recruiter performance'], ['requirements', 'Requirements'], ['pscare', 'PS Care'], ['technology', 'Technology profiles']] as const;
export default function Reports() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('recruiter');
  const [range, setRange] = useState({ days: '30', from: '', to: '', team: '' });
  const [d, setD] = useState<any>(null); const [err, setErr] = useState('');
  useEffect(() => { const t = new URLSearchParams(window.location.search).get('tab'); if (t && TABS.some(([k]) => k === t)) setTab(t as any); }, []);
  useEffect(() => {
    setD(null); setErr('');
    api(`/api/reports/${tab}${qs(range.from ? { from: range.from, to: range.to, team: range.team } : { days: range.days, team: range.team })}`).then(setD).catch((e) => setErr(e.message));
  }, [tab, range]);
  const csv = () => {
    if (!d?.rows || !d?.columns) return;
    const head = ['Recruiter', ...d.columns.map((c: any) => c.label)];
    const lines = [head, ...d.rows.map((r: any) => [r.name, ...d.columns.map((c: any) => r[c.key] ?? 0)])].map((l) => l.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv' })); a.download = `recruiter-report-${d.from}-${d.to}.csv`; a.click();
  };
  return (
    <>
      <PageHeader title="Reports" sub="Columns come from your regions and profile statuses, so new stages appear automatically." actions={tab === 'recruiter' && d && <button className="btn-outline" onClick={csv}><L.Download className="h-4 w-4" /> Export CSV</button>} />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-[#E6EBF4]">{TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={clsx('tab', tab === k && 'tab-active')}>{l}</button>)}</div>
      {tab !== 'technology' && (
        <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
          <div><label className="label">Period</label><div className="flex">{['1', '7', '30', '90', '365'].map((x) => <button key={x} onClick={() => setRange({ ...range, days: x, from: '', to: '' })} className={clsx('btn-outline btn-sm rounded-none first:rounded-l-lg last:rounded-r-lg', !range.from && range.days === x && 'bg-navy text-white hover:bg-navy')}>{x === '1' ? 'Today' : x === '365' ? '12 months' : `${x} days`}</button>)}</div></div>
          <div><label className="label">From</label><input type="date" className="input h-9" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value, to: range.to || new Date().toISOString().slice(0, 10) })} /></div>
          <div><label className="label">To</label><input type="date" className="input h-9" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
          {tab === 'recruiter' && <div className="w-56"><label className="label">Team</label><LookupSelect lookup="team" value={range.team} onChange={(v) => setRange({ ...range, team: v })} placeholder="All teams" /></div>}
        </div>
      )}
      {err && <div className="card p-6 text-sm text-red-700">{err}</div>}
      {!d && !err && <Loading />}
      {d && tab === 'recruiter' && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px]"><thead className="bg-[#F8FAFD]"><tr><th className="th sticky left-0 bg-[#F8FAFD]">Recruiter</th>{d.columns.map((c: any) => <th key={c.key} className="th text-right">{c.label}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#EEF2F8]">{d.rows.map((r: any) => <tr key={r.id} className="hover:bg-[#F8FAFD]"><td className="td sticky left-0 bg-white font-semibold text-navy">{r.name}</td>{d.columns.map((c: any) => <td key={c.key} className={clsx('td text-right tabular-nums', !Number(r[c.key]) && 'text-slate2/40')}>{Number(r[c.key] || 0)}</td>)}</tr>)}
              {!d.rows.length && <tr><td className="td py-10 text-center text-slate2" colSpan={d.columns.length + 1}>No recruiter activity in this period.</td></tr>}
              {d.rows.length > 1 && <tr className="bg-[#F8FAFD] font-bold"><td className="td sticky left-0 bg-[#F8FAFD]">Total</td>{d.columns.map((c: any) => <td key={c.key} className="td text-right">{d.rows.reduce((a: number, r: any) => a + Number(r[c.key] || 0), 0)}</td>)}</tr>}</tbody></table>
        </div>
      )}
      {d && tab === 'requirements' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Chart title="Requirements by client" data={d.byClient} /><Chart title="By status" data={d.byStatus} /><Chart title="By priority" data={d.byPriority} />
          <div className="card overflow-hidden lg:col-span-2"><h3 className="px-5 pt-4 text-sm font-bold text-navy">Open requirements by age</h3>
            <table className="mt-2 w-full"><thead className="bg-[#F8FAFD]"><tr><th className="th">Requirement</th><th className="th">Client</th><th className="th text-right">Days open</th><th className="th text-right">Sourced</th><th className="th text-right">Submitted</th></tr></thead>
              <tbody className="divide-y divide-[#EEF2F8]">{d.ageing.map((r: any) => <tr key={r.rID}><td className="td"><Link href={`/m/requirements/${r.rID}`} className="font-semibold text-navy hover:underline">{r.roleName}</Link></td><td className="td">{r.clientName}</td><td className="td text-right">{r.days}</td><td className="td text-right">{r.sourced}</td><td className={clsx('td text-right', !Number(r.submitted) && 'font-bold text-red-700')}>{r.submitted}</td></tr>)}</tbody></table></div>
        </div>
      )}
      {d && tab === 'pscare' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Chart title="Consultants by status" data={d.byStatus} /><Chart title="By end client" data={d.byClient} /><Chart title="By recruiter" data={d.byRecruiter} /><Chart title="New engagements per month" data={d.starts} />
          <div className="card overflow-hidden lg:col-span-2"><h3 className="px-5 pt-4 text-sm font-bold text-navy">Contracts ending in the next 60 days</h3>
            <table className="mt-2 w-full"><thead className="bg-[#F8FAFD]"><tr><th className="th">Consultant</th><th className="th">Role</th><th className="th">End client</th><th className="th">End date</th></tr></thead>
              <tbody className="divide-y divide-[#EEF2F8]">{d.ending.map((c: any) => <tr key={c.cdID}><td className="td"><Link href={`/m/consultants/${c.cdID}`} className="font-semibold text-navy hover:underline">{c.candidateName}</Link></td><td className="td">{c.role}</td><td className="td">{c.endClient}</td><td className="td">{fmtDate(c.endDate)}</td></tr>)}
                {!d.ending.length && <tr><td className="td py-8 text-center text-slate2" colSpan={4}>No contracts ending soon.</td></tr>}</tbody></table></div>
        </div>
      )}
      {d && tab === 'technology' && (
        <div className="card overflow-hidden"><table className="w-full"><thead className="bg-[#F8FAFD]"><tr><th className="th">Technology group</th><th className="th">Technology</th><th className="th text-right">Profiles</th></tr></thead>
          <tbody className="divide-y divide-[#EEF2F8]">{d.rows.map((r: any, i: number) => <tr key={i}><td className="td">{r.group}</td><td className="td font-semibold text-navy">{r.technology}</td><td className="td text-right">{r.profiles}</td></tr>)}
            {!d.rows.length && <tr><td colSpan={3} className="td py-10 text-center text-slate2">No profiles are tagged with technology roles yet.</td></tr>}</tbody></table></div>
      )}
    </>
  );
}
function Chart({ title, data }: { title: string; data: any[] }) {
  const rows = data.map((x) => ({ ...x, value: Number(x.value) }));
  return (
    <div className="card p-5"><h3 className="mb-3 text-sm font-bold text-navy">{title}</h3>
      {rows.length ? <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 30)}><BarChart data={rows} layout="vertical" margin={{ left: 10, right: 20 }}>
        <XAxis type="number" hide allowDecimals={false} /><YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11, fill: '#576E9A' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
        <Bar dataKey="value" fill="#00297B" radius={[0, 6, 6, 0]} barSize={14} /></BarChart></ResponsiveContainer> : <p className="py-8 text-center text-sm text-slate2">No data.</p>}
    </div>
  );
}
