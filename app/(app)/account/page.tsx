'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { api } from '@/lib/client';
import { PageHeader, Spinner, useToast } from '@/components/ui';

function Account() {
  const toast = useToast(); const sp = useSearchParams();
  const [me, setMe] = useState<any>(null); const [f, setF] = useState({ current: '', password: '', confirm: '' }); const [busy, setBusy] = useState(false);
  useEffect(() => { api('/api/auth/me').then(setMe).catch(() => {}); }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (f.password !== f.confirm) return toast('error', 'The new passwords do not match.');
    setBusy(true); try { await api('/api/me/password', { method: 'POST', json: f }); toast('success', 'Password changed'); setF({ current: '', password: '', confirm: '' }); } catch (e: any) { toast('error', e.message); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Account" sub={me ? `${me.user.name} · ${me.user.email} · ${me.roleTitle}` : ''} />
      {sp.get('first') && <div className="mb-5 rounded-xl border border-teal/40 bg-teal-50 px-4 py-3 text-sm text-navy">Please choose a new password before you continue.</div>}
      <form onSubmit={save} className="card max-w-lg space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate2">Change password</h2>
        <div><label className="label">Current password</label><input type="password" className="input" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required /></div>
        <div><label className="label">New password</label><input type="password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>
        <div><label className="label">Confirm new password</label><input type="password" className="input" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required /></div>
        <p className="text-xs text-slate2">At least 8 characters with upper- and lower-case letters and a number.</p>
        <button className="btn-primary" disabled={busy}>{busy && <Spinner />} Update password</button>
      </form>
    </>
  );
}
export default function Page() { return <Suspense><Account /></Suspense>; }
