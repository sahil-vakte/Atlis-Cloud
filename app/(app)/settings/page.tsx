'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import * as L from '@/components/icons';
import { api, fileUrl } from '@/lib/client';
import { Loading, PageHeader, Spinner, useToast } from '@/components/ui';

const FIELDS: [string, string, string?][] = [
  ['brand_name', 'Product name'], ['brand_tagline', 'Tagline'], ['support_email', 'Support email'],
  ['brand_logo_light', 'Logo for light backgrounds', 'logo'], ['brand_logo_dark', 'Logo for dark backgrounds (sidebar, emails)', 'logo'], ['brand_icon', 'Icon', 'logo'],
  ['default_page_size', 'Default rows per page'], ['cv_max_upload_mb', 'Maximum upload size (MB)'], ['session_hours', 'Sign-in session length (hours)'],
];
export default function Settings() {
  const toast = useToast();
  const [s, setS] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/api/settings').then(setS).catch((e) => toast('error', e.message)); }, []); // eslint-disable-line
  if (!s) return <Loading />;
  const upload = async (k: string, f: File) => {
    const fd = new FormData(); fd.append('file', f); fd.append('folder', 'branding');
    try { const r = await api('/api/upload', { method: 'POST', body: fd }); setS({ ...s, [k]: fileUrl(r.path) }); } catch (e: any) { toast('error', e.message); }
  };
  const save = async () => { setBusy(true); try { await api('/api/settings', { method: 'PUT', json: s }); toast('success', 'Settings saved. Reload to see branding changes.'); } catch (e: any) { toast('error', e.message); } finally { setBusy(false); } };
  return (
    <>
      <PageHeader title="Settings" sub="Branding and behaviour. Stored in the database, so no redeploy is needed."
        actions={<button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Spinner /> : <L.Save className="h-4 w-4" />} Save settings</button>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card space-y-4 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate2">Branding</h2>
          {FIELDS.slice(0, 6).map(([k, label, kind]) => (
            <div key={k}><label className="label">{label}</label>
              {kind === 'logo' ? (
                <div className="flex items-center gap-3">
                  <div className={`grid h-14 w-40 place-items-center rounded-lg border border-[#E6EBF4] ${k === 'brand_logo_dark' ? 'bg-navy' : 'bg-white'}`}>{s[k] && <img src={s[k]} alt="" className="max-h-9 max-w-[130px]" />}</div>
                  <label className="btn-outline btn-sm cursor-pointer"><L.Upload className="h-3.5 w-3.5" /> Replace<input type="file" accept=".svg,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(k, e.target.files[0])} /></label>
                </div>
              ) : <input className="input" value={s[k] || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} />}
            </div>))}
        </section>
        <div className="space-y-5">
          <section className="card space-y-4 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate2">Application</h2>
            {FIELDS.slice(6).map(([k, label]) => <div key={k}><label className="label">{label}</label><input className="input" value={s[k] || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>)}
          </section>
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate2">More configuration</h2>
            <div className="grid gap-2 text-sm">
              {[['/admin/notification-emails', 'Notification emails and replacements'], ['/m/master-options', 'Dropdown options (job types, entities, statuses …)'], ['/m/email-settings', 'SMTP accounts'], ['/m/email-templates', 'Email templates'], ['/m/notification-alerts', 'Notification banners'], ['/roles', 'Roles & permissions'], ['/masters', 'All master data']].map(([h, t]) => (
                <Link key={h} href={h} className="flex items-center justify-between rounded-lg border border-[#E6EBF4] px-3 py-2 hover:border-navy"><span className="font-medium text-navy">{t}</span><L.ChevronRight className="h-4 w-4 text-slate2" /></Link>))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
