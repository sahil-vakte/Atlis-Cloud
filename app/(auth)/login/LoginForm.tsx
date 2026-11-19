'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Challenge = { setup: boolean; secret?: string; qr?: string };
export default function LoginForm() {
  const router = useRouter(), sp = useSearchParams();
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [show, setShow] = useState(false);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const r = await fetch(challenge ? '/api/auth/mfa' : '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(challenge ? { code } : { email, password }) });
      const d = await r.json();
      if (!r.ok) { if (r.status === 401 && challenge) { setChallenge(null); setPassword(''); } throw new Error(d.message || 'Sign-in failed.'); }
      if (d.status === 'mfa_required') {
        const details = await fetch('/api/auth/mfa', { cache: 'no-store' }), data = await details.json();
        if (!details.ok) throw new Error(data.message || 'Unable to load authenticator setup.');
        setChallenge(data); setPassword(''); setCode(''); return;
      }
      const next = sp.get('next') || '/dashboard';
      const safeNext = next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/dashboard';
      router.push(d.mustChangePassword ? '/account?first=1' : safeNext); router.refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={submit}>
    <Link href="/" className="mb-6 inline-block text-sm font-semibold text-navy hover:underline">Atlis Cloud home</Link>
    <h2 className="text-2xl font-extrabold tracking-tight text-navy">{challenge ? challenge.setup ? 'Set up your authenticator' : 'Verify your sign-in' : 'Welcome back'}</h2>
    <p className="mt-2 text-base text-slate2">{challenge ? challenge.setup ? 'Secure your account before you continue.' : 'Enter the six-digit code from your authenticator app.' : 'Sign in with your password and authenticator.'}</p>
    {err && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">{err}</div>}
    {challenge ? <div className="mt-6 space-y-5">
      {challenge.setup && <>
        <p className="text-sm leading-6">Open Google Authenticator, Microsoft Authenticator, or another TOTP app. Choose <strong>Add account</strong> and scan this QR code.</p>
        <img src={challenge.qr} alt="Scan this QR code with your authenticator app" width={256} height={256} className="mx-auto rounded-xl border border-slate-200 bg-white" />
        <details className="rounded-lg border border-slate-200 p-3 text-sm"><summary className="cursor-pointer font-semibold">Can’t scan the code?</summary><p className="mt-3">Add a time-based account named Atlis Cloud using this setup key:</p><code className="mt-2 block break-all select-all rounded bg-slate-100 p-3">{challenge.secret}</code></details>
        <p className="text-sm text-slate2">Keep your authenticator account safe. You will need a code every time you sign in. Never share this QR code or setup key.</p>
      </>}
      <div><label htmlFor="code" className="mb-2 block text-sm font-semibold">Authenticator code</label><input autoFocus id="code" className="input h-12 text-center text-xl tracking-[.3em]" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></div>
      <button className="btn-primary h-12 w-full" disabled={busy}>{busy ? 'Verifying…' : challenge.setup ? 'Confirm setup and sign in' : 'Verify and sign in'}</button>
      <p className="text-sm text-slate2">Lost access to your authenticator? Contact your administrator to verify your identity and reset setup.</p>
      <button type="button" disabled={busy} className="text-sm font-semibold text-navy underline" onClick={() => { setChallenge(null); setCode(''); setErr(''); }}>Use a different account</button>
    </div> : <div className="mt-6 space-y-4">
      <div><label className="mb-2 block text-sm font-semibold" htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" required className="input h-12" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div><div className="flex items-center justify-between"><label className="mb-2 block text-sm font-semibold" htmlFor="pw">Password</label><Link href="/forgot-password" className="mb-2 text-sm font-semibold text-navy hover:underline">Forgot password?</Link></div>
        <div className="relative"><input id="pw" type={show ? 'text' : 'password'} autoComplete="current-password" required className="input h-12 pr-16" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate2" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button></div></div>
      <button className="btn-primary h-12 w-full text-base" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
    </div>}
    <p className="mt-8 text-center text-sm text-slate2">Looking for work? <Link href="/careers" className="font-semibold text-navy hover:underline">Browse open roles</Link></p>
  </form>;
}
