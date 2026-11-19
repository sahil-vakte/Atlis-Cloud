'use client';
import { useState } from 'react';
import * as L from '@/components/icons';
const F = ({ n, l, req, type = 'text' }: any) => <div><label className="label">{l}{req && ' *'}</label><input name={n} type={type} required={req} className="input" /></div>;
export default function Register({ params }: { params: { kind: string } }) {
  const vendor = params.kind === 'vendor';
  const [done, setDone] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  if (!['client', 'vendor'].includes(params.kind)) return <main className="mx-auto max-w-xl px-6 py-12"><div className="card p-7">Page not found.</div></main>;
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true); setErr('');
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    const r = await fetch(`/api/public/register/${params.kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json(); r.ok ? setDone(j.message) : setErr(j.message); setBusy(false);
  };
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="card p-7">
        {done ? <div className="py-8 text-center"><L.CheckCircle2 className="mx-auto h-10 w-10 text-teal-700" /><p className="mt-3 font-semibold text-navy">{done}</p></div> : (
          <form onSubmit={submit}>
            <h1 className="text-2xl font-extrabold text-navy">{vendor ? 'Become a supply partner' : 'Register as a client'}</h1>
            <p className="mt-1 text-sm text-slate2">{vendor ? 'Tell us about your company and the skills you can supply.' : 'Tell us about your organisation and we will be in touch.'}</p>
            {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <F n="company" l="Company name" req /><F n="website" l="Website" />
              <F n="contactName" l="Contact name" req /><F n="designation" l="Job title" />
              <F n="email" l="Email" req type="email" /><F n="phone" l="Phone" />
              <F n="address" l="Address" /><F n="city" l="City" /><F n="country" l="Country" /><F n="postcode" l="Postcode" />
              {vendor && <div className="sm:col-span-2"><label className="label">Skills / technologies you supply</label><textarea name="skills" className="input min-h-[80px]" /></div>}
              <div className="sm:col-span-2"><label className="label">How did you hear about us?</label><input name="source" className="input" /></div>
              <div className="sm:col-span-2"><label className="label">Anything else?</label><textarea name="notes" className="input min-h-[80px]" /></div>
            </div>
            <button className="btn-primary mt-6" disabled={busy}>{busy ? <L.Loader2 className="h-4 w-4 animate-spin" /> : <L.Send className="h-4 w-4" />} Submit registration</button>
          </form>)}
      </div>
    </main>
  );
}
