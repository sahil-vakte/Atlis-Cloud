'use client';
import { useEffect, useState } from 'react';
import * as L from '@/components/icons';

const COPY: Record<string, { title: string; body: (d: any) => React.ReactNode; agree: string }> = {
  rtr: { title: 'Right to represent', agree: 'I confirm that you may represent me for this role and that I have not authorised anyone else to submit me for it.',
    body: (d) => <>We would like to put you forward for <b>{d.roleName}</b>{d.clientName && <> with <b>{d.clientName}</b></>}{d.location && <> in {d.location}</>}{d.rateExpected && <> at <b>{d.currencyType} {d.rateExpected}</b></>}.</> },
  gdpr: { title: 'Consent to store your details', agree: 'I consent to my personal data being stored and processed to find me suitable work, and I know I can withdraw consent at any time.',
    body: () => <>We keep your CV and contact details so we can contact you about suitable roles. Under GDPR we need your permission to do so.</> },
  invoice: { title: 'No outstanding invoices', agree: 'I confirm that all my invoices for this quarter have been paid and nothing is outstanding.',
    body: (d) => <>Please confirm there are no outstanding invoices for <b>{d.quarterKey}</b>.</> },
};
export default function Consent({ params }: { params: { kind: string; token: string } }) {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState(''); const [sig, setSig] = useState(''); const [agree, setAgree] = useState(false); const [done, setDone] = useState(''); const [busy, setBusy] = useState(false);
  const c = COPY[params.kind];
  useEffect(() => { fetch(`/api/public/consent/${params.kind}/${params.token}`).then(async (r) => { const j = await r.json(); r.ok ? setD(j) : setErr(j.message); }); }, [params]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const r = await fetch(`/api/public/consent/${params.kind}/${params.token}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signature: sig, agree }) });
    const j = await r.json(); r.ok ? setDone(j.message) : setErr(j.message); setBusy(false);
  };
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <div className="card p-7">
        {!c ? <p>Unknown link.</p> : err ? <p className="text-sm text-red-700">{err}</p> : !d ? <p className="text-sm text-slate2">Loading…</p> : done || d.done ? (
          <div className="text-center"><L.CheckCircle2 className="mx-auto h-10 w-10 text-teal-700" /><p className="mt-3 font-semibold text-navy">{done || 'You have already confirmed this. Thank you.'}</p></div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h1 className="text-2xl font-extrabold text-navy">{c.title}</h1>
            <p className="text-sm">Hi {d.name},</p><p className="text-sm">{c.body(d)}</p>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />{c.agree}</label>
            <div><label className="label">Type your full name as your signature</label><input className="input h-11 font-semibold italic" value={sig} onChange={(e) => setSig(e.target.value)} /></div>
            <button className="btn-primary w-full" disabled={busy || !agree || sig.trim().length < 3}>{busy ? <L.Loader2 className="h-4 w-4 animate-spin" /> : <L.Check className="h-4 w-4" />} Confirm</button>
            <p className="text-xs text-slate2">We record your typed name, the time and your IP address as evidence of this confirmation.</p>
          </form>
        )}
      </div>
    </main>
  );
}
