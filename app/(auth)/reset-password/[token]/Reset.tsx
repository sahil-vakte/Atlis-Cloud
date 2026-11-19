'use client';
import Link from 'next/link';
import { useState } from 'react';
export default function Reset({ token, welcome }: { token: string; welcome: boolean }) {
  const [p1, setP1] = useState(''); const [p2, setP2] = useState(''); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (p1 !== p2) return setMsg({ ok: false, t: 'The passwords do not match.' });
    setBusy(true); const r = await fetch('/api/auth/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password: p1 }) });
    const d = await r.json(); setMsg({ ok: r.ok, t: d.message }); setBusy(false);
  };
  return (
    <form onSubmit={submit}>
      <h2 className="text-2xl font-extrabold text-navy">{welcome ? 'Activate your account' : 'Choose a new password'}</h2>
      <p className="mt-1 text-sm text-slate2">At least 8 characters, with upper- and lower-case letters and a number.</p>
      {msg && <div className={`mt-5 rounded-lg border px-3 py-2.5 text-sm ${msg.ok ? 'border-teal/40 bg-teal-50 text-teal-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{msg.t}</div>}
      {!msg?.ok && <div className="mt-6 space-y-4">
        <div><label className="label">New password</label><input type="password" required className="input h-11" value={p1} onChange={(e) => setP1(e.target.value)} /></div>
        <div><label className="label">Confirm password</label><input type="password" required className="input h-11" value={p2} onChange={(e) => setP2(e.target.value)} /></div>
        <button className="btn-primary h-11 w-full" disabled={busy}>Save password</button></div>}
      <p className="mt-6 text-center text-sm"><Link href="/login" className="font-semibold text-navy hover:underline">Go to sign in</Link></p>
    </form>
  );
}
