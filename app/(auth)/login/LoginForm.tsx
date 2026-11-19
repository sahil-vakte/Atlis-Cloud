'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as L from '@/components/icons';

export default function LoginForm() {
  const router = useRouter(); const sp = useSearchParams();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [show, setShow] = useState(false);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(d.message || 'Sign-in failed'); setBusy(false); return; }
    router.push(d.mustChangePassword ? '/account?first=1' : sp.get('next') || '/dashboard'); router.refresh();
  };
  return (
    <form onSubmit={submit}>
      <h2 className="text-2xl font-extrabold tracking-tight text-navy">Welcome back</h2>
      <p className="mt-1 text-sm text-slate2">Sign in to your account to continue.</p>
      {err && <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"><L.AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{err}</div>}
      <div className="mt-6 space-y-4">
        <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" required className="input h-11" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><div className="flex items-center justify-between"><label className="label" htmlFor="pw">Password</label><Link href="/forgot-password" className="mb-1 text-xs font-semibold text-navy hover:underline">Forgot password?</Link></div>
          <div className="relative"><input id="pw" type={show ? 'text' : 'password'} autoComplete="current-password" required className="input h-11 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate2" onClick={() => setShow((s) => !s)} aria-label="Show password">{show ? <L.EyeOff className="h-4 w-4" /> : <L.Eye className="h-4 w-4" />}</button></div></div>
        <button className="btn-primary h-11 w-full text-[15px]" disabled={busy}>{busy ? <L.Loader2 className="h-4 w-4 animate-spin" /> : <L.LogIn className="h-4 w-4" />} Sign in</button>
      </div>
      <p className="mt-8 text-center text-xs text-slate2">Looking for work? <Link href="/careers" className="font-semibold text-navy hover:underline">Browse open roles</Link></p>
    </form>
  );
}
