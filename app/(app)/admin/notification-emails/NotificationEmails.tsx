'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { PageHeader, Spinner, useToast } from '@/components/ui';

type Route = { id: number; original_email: string; replacement_email: string; purpose: string; enabled: boolean };
type Config = { routes: Route[]; entities: { id: number; value: string; label: string }[]; support_email: string; reminder_email: string; enabled: boolean; serverAllowed: boolean; smtpConfigured: boolean };
export default function NotificationEmails({ readOnly }: { readOnly: boolean }) {
  const [data,setData] = useState<Config | null>(null), [error,setError] = useState(''), [busy,setBusy] = useState(false), [search,setSearch] = useState('');
  const toast = useToast();
  const load = async () => { try { const d = await api<Config>('/api/admin/notification-emails'); setData({ ...d, routes: d.routes.map(r => ({ ...r, enabled: !!r.enabled })) }); setError(''); } catch (e: any) { setError(e.message); } };
  useEffect(() => { load(); }, []);
  const save = async () => { setBusy(true); try { const r = await api('/api/admin/notification-emails', { method:'PUT', json:data }); toast('success',r.message); await load(); } catch(e:any) { toast('error',e.message); } finally { setBusy(false); } };
  const discover = async () => { setBusy(true); try { await api('/api/admin/notification-emails',{ method:'POST' }); await load(); toast('success','Recipient list refreshed. New replacements are disabled.'); } catch(e:any) { toast('error',e.message); } finally { setBusy(false); } };
  if (!data) return <div className="card p-6" role="status">{error || 'Loading notification settings…'}{error && <button className="btn-outline ml-4" onClick={load}>Retry</button>}</div>;
  const update = (id:number, patch:Partial<Route>) => setData({...data,routes:data.routes.map(r=>r.id===id?{...r,...patch}:r)});
  return <>
    <PageHeader title="Notification emails" sub="Review why each address was used and choose where future notifications go."
      actions={<button className="btn-primary" disabled={busy || readOnly} onClick={save}>{busy && <Spinner />} Save changes</button>} />
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
      <strong>{data.enabled && data.serverAllowed && data.smtpConfigured ? 'Email delivery is enabled.' : 'Email delivery is disabled.'}</strong>
      <p className="mt-1">Saving settings never sends an email. Historical addresses below are reference information; they are blocked unless you enable a replacement.</p>
      {!data.serverAllowed && <p className="mt-1">Sending is also locked off in the server configuration.</p>}
      {!data.smtpConfigured && <p className="mt-1">An SMTP server must be configured before delivery can be enabled.</p>}
    </div>
    <fieldset disabled={readOnly || busy}>
    <section className="card mb-5 space-y-4 p-5">
      <h2 className="font-bold text-navy">General notification inboxes</h2>
      <div className="grid gap-5 md:grid-cols-2">
        <div><label htmlFor="support-email" className="label">Registration notifications</label><input id="support-email" className="input" value={data.support_email} onChange={e=>setData({...data,support_email:e.target.value})}/><p className="mt-1 text-sm text-slate2">Receives new client and vendor registrations. Also used as the final reminder fallback.</p></div>
        <div><label htmlFor="reminder-email" className="label">Default reminder inbox</label><input id="reminder-email" className="input" value={data.reminder_email} onChange={e=>setData({...data,reminder_email:e.target.value})}/><p className="mt-1 text-sm text-slate2">Contract, purchase-order and document expiry when no entity route exists.</p></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.enabled} disabled={!data.serverAllowed || !data.smtpConfigured} onChange={e=>setData({...data,enabled:e.target.checked})}/> Enable email delivery after reviewing recipients</label>
    </section>
    <section className="card mb-5 p-5">
      <h2 className="font-bold text-navy">Business entity reminder inboxes</h2>
      <p className="mb-4 mt-1 text-sm text-slate2">Overrides for contract, purchase-order and document expiry. Leave blank to use the historical replacement route below; disabled routes suppress that entity’s reminders.</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{data.entities.map(e=><div key={e.id}><label htmlFor={`entity-${e.id}`} className="label">{e.value}</label><input id={`entity-${e.id}`} className="input" placeholder="Use replacement route" value={e.label} onChange={ev=>setData({...data,entities:data.entities.map(x=>x.id===e.id?{...x,label:ev.target.value}:x)})}/></div>)}</div>
    </section>
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h2 className="font-bold text-navy">Historical addresses and replacements</h2><p className="mt-1 text-sm text-slate2">Replacements apply to To, CC and BCC across all application emails. Use comma-separated destinations.</p></div><button className="btn-outline" onClick={discover}>Discover existing recipients</button></div>
      <div className="px-5 pb-4"><label htmlFor="route-search" className="sr-only">Search recipients or purposes</label><input id="route-search" className="input" placeholder="Search address or purpose…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate2"><tr><th className="p-4">Historical email / purpose</th><th className="min-w-[280px] p-4">Replacement destinations</th><th className="p-4">Enabled</th></tr></thead><tbody>{data.routes.filter(r=>(r.original_email+' '+r.purpose).toLowerCase().includes(search.toLowerCase())).map(r=><tr className="border-t border-slate-100" key={r.id}><td className="max-w-md p-4"><div className="break-all font-semibold text-navy">{r.original_email}</div><p className="mt-1 text-slate2">{r.purpose}</p></td><td className="p-4"><input aria-label={`Replacement for ${r.original_email}`} className="input" placeholder="your-team@example.com" value={r.replacement_email} onChange={e=>update(r.id,{replacement_email:e.target.value})}/></td><td className="p-4"><input aria-label={`Enable replacement for ${r.original_email}`} type="checkbox" checked={r.enabled} onChange={e=>update(r.id,{enabled:e.target.checked})}/></td></tr>)}</tbody></table></div>
      <p className="border-t p-4 text-sm text-slate2">Password resets go to account holders; activation and personal reminders go to consultants. This screen reroutes legacy addresses without changing their login identities or historical records. SMTP sender identities must be configured separately.</p>
    </section>
    </fieldset>
  </>;
}
