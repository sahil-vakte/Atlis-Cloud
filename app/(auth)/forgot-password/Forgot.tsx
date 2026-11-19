'use client';
import Link from 'next/link';
import { useState } from 'react';
export default function Forgot() {
  const [email, setEmail] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); const r = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) }); setMsg((await r.json()).message); setBusy(false); };
  return (
    <form onSubmit={submit}>
      <h2 className="text-2xl font-extrabold text-navy">Reset your password</h2>
      <p className="mt-1 text-sm text-slate2">Enter your account email and we'll send you a link.</p>
      {msg ? <div className="mt-6 rounded-lg border border-teal/40 bg-teal-50 px-3 py-3 text-sm text-teal-700">{msg}</div> : (
        <div className="mt-6 space-y-4"><div><label className="label">Email</label><input type="email" required className="input h-11" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <button className="btn-primary h-11 w-full" disabled={busy}>Send reset link</button></div>)}
      <p className="mt-6 text-center text-sm"><Link href="/login" className="font-semibold text-navy hover:underline">Back to sign in</Link></p>
    </form>
  );
}
