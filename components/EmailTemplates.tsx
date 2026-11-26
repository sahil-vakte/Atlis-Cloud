'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Plus, Search, Pencil, Save, Monitor, Smartphone, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/client';
import DataTable, { loadMeta, type Meta } from './DataTable';
import { Loading, PageHeader, Spinner, useToast } from './ui';
import { LookupSelect } from './fields';
import ModuleActions from './ModuleActions';
import { legacyTemplateBrand, templatePreview, templateVariables } from '@/lib/template-content';

export const isEmailTemplates = (module: string) => ['email-templates', 'pscare-templates'].includes(module);
const columns = (module: string) => module === 'email-templates'
  ? { name: 'email_template_name', subject: 'email_template_subject', body: 'email_template_html' }
  : { name: 'templateName', subject: 'subject', body: 'description' };

export default function EmailTemplates({ module, id, editing = false }: { module: string; id?: string; editing?: boolean }) {
  const router = useRouter(), toast = useToast();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [rows, setRows] = useState<any[]>([]), [total, setTotal] = useState(0);
  const [values, setValues] = useState<Record<string, any>>({});
  const [query, setQuery] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [tableView, setTableView] = useState(false);
  const c = columns(module), base = `/m/${module}`, detail = !!id || editing;
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const timer = setTimeout(async () => {
      try {
        const m = await loadMeta(module); if (!active) return; setMeta(m);
        if (id) { const row = await api(`/api/m/${module}/${id}`); if (active) setValues(row); }
        else if (editing) setValues({ ...m.defaults, status: 1, [c.name]: '', [c.subject]: '', [c.body]: '<p>Hello {{recipient_name}},</p><p></p><p>Kind regards,<br>Atlis Cloud</p>', email_template_from: 'Atlis Cloud', email_template_from_mail: 'support@atlis.cloud' });
        else {
          const p = new URLSearchParams({ page: String(page), pageSize: '12', q: query });
          if (status) p.set('f.status', status);
          const data = await api(`/api/m/${module}?${p}`); if (active) { setRows(data.rows); setTotal(data.total); }
        }
      } catch (e: any) { if (active) setError(e.message); }
      finally { if (active) setLoading(false); }
    }, detail ? 0 : 200);
    return () => { active = false; clearTimeout(timer); };
  }, [module, id, editing, query, status, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (key: string, value: any) => setValues(v => ({ ...v, [key]: value }));
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!meta || !editing || !(id ? meta.can.edit : meta.can.add)) return;
    setBusy(true); setError('');
    try {
      const payload = Object.fromEntries(meta.fields.filter(f => f.name in values).map(f => [f.name, values[f.name]]));
      if (module === 'email-templates') payload.email_template_variables = templateVariables(`${values[c.subject]} ${values[c.body]}`).map(v => `{{${v}}}`).join(',');
      const result = await api(`/api/m/${module}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', json: payload });
      toast('success', 'Template saved. No email was sent.'); router.push(`${base}/${id || result.id}`); router.refresh();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  if (loading && !meta) return <Loading />;
  if (!meta) return <div role="alert" className="card p-6 text-red-700">{error}</div>;
  const canEdit = editing && (id ? meta.can.edit : meta.can.add);
  const body = String(values[c.body] || '');
  const variables = templateVariables(`${values[c.subject] || ''} ${body}`);
  const legacy = legacyTemplateBrand.test(`${values[c.name]} ${values[c.subject]} ${body}`);
  return <>
    <PageHeader crumbs="Workspace / Communications" title={detail ? (editing ? (id ? 'Edit email template' : 'New email template') : values[c.name] || 'Email template') : 'Email templates'}
      sub={detail ? 'Create clear, consistent messages from Atlis Cloud.' : 'Your Atlis Cloud messages, ready for every stage of the relationship.'}
      actions={detail ? <Link className="btn-outline" href={base}><ArrowLeft size={16} /> All templates</Link> : meta.can.add ? <Link href={`${base}/new`} className="btn-primary"><Plus size={16} /> New template</Link> : undefined} />
    {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
    {!detail ? <>
      <div className="mb-4 flex justify-end"><button type="button" className="btn-outline" onClick={() => setTableView(v => !v)}>{tableView ? 'Card view' : 'Manage records'}</button></div>
      {tableView ? <DataTable module={module} /> : <>
      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#00297B] p-6 text-white">
        <div className="flex items-center gap-4"><div className="rounded-xl bg-white/10 p-3"><Mail size={26} /></div><div><p className="text-lg font-semibold">One voice. Atlis Cloud.</p><p className="mt-1 text-sm text-blue-100">Branded messages for recruitment, onboarding and consultant care.</p></div></div>
        <span className="rounded-full border border-white/25 px-4 py-2 text-sm">{total} {total === 1 ? 'template' : 'templates'} in this view</span>
      </section>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <nav aria-label="Template libraries" className="flex rounded-lg border bg-white p-1"><Link className={`rounded-md px-4 py-2 text-sm font-semibold ${module === 'email-templates' ? 'bg-navy text-white' : 'text-slate2'}`} href="/m/email-templates">General</Link><Link className={`rounded-md px-4 py-2 text-sm font-semibold ${module === 'pscare-templates' ? 'bg-navy text-white' : 'text-slate2'}`} href="/m/pscare-templates">PS Care</Link></nav>
        <div className="relative min-w-[220px] flex-1"><Search size={17} className="absolute left-3 top-3 text-slate2" /><input aria-label="Search templates" className="input pl-10" placeholder="Search templates by name or subject" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></div>
        <select aria-label="Filter by status" className="input !w-auto" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option><option value="1">Active</option><option value="0">Inactive</option></select>
      </div>
      {loading ? <Loading /> : rows.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map(row => <article key={row[meta.pk]} className="card flex flex-col p-5 transition-shadow hover:shadow-md">
        <div className="mb-5 flex items-center justify-between"><span className="rounded-xl bg-blue-50 p-3 text-navy"><Mail size={21} /></span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${Number(row.status) === 1 ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>{Number(row.status) === 1 ? 'Active' : 'Inactive'}</span></div>
        <h2 className="text-lg font-semibold text-navy"><Link href={`${base}/${row[meta.pk]}`} className="hover:underline">{row[c.name]}</Link></h2><p className="mb-6 mt-2 line-clamp-3 text-sm leading-6 text-slate2">{row[c.subject] || 'No subject yet'}</p>
        <div className="mt-auto flex items-center justify-between border-t pt-4"><span className="text-xs text-slate2">{module === 'email-templates' ? 'General communication' : row.__labels?.emailcategoryID || 'Consultant care'}</span><Link className="text-sm font-semibold text-navy hover:underline" href={`${base}/${row[meta.pk]}`}>Open template</Link></div>
      </article>)}</div> : <div className="card p-12 text-center"><Mail className="mx-auto mb-4 text-slate2" size={32} /><h2 className="text-lg font-semibold">No templates found</h2><p className="mt-2 text-slate2">Try another search or create a new template.</p></div>}
      {total > 12 && <div className="mt-5 flex items-center justify-end gap-4"><button className="btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span className="text-sm">Page {page} of {Math.ceil(total / 12)}</span><button className="btn-outline" disabled={page * 12 >= total} onClick={() => setPage(p => p + 1)}>Next</button></div>}
      </>}
    </> : loading ? <Loading /> : <form onSubmit={save}>
      {editing && !canEdit && <p role="alert" className="mb-4 text-red-700">You do not have permission to edit this template.</p>}
      {legacy && <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-4 text-amber-900">This template contains a previous company name. Review it before use.</p>}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="card space-y-5 p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Message details</h2>{!editing && meta.can.edit && <Link className="btn-outline" href={`${base}/${id}/edit`}><Pencil size={15} /> Edit template</Link>}</div>
          <label className="block"><span className="label">Template name</span><input className="input" required maxLength={255} readOnly={!canEdit} value={values[c.name] || ''} onChange={e => set(c.name, e.target.value)} /></label>
          <label className="block"><span className="label">Email subject</span><input className="input" required readOnly={!canEdit} value={values[c.subject] || ''} onChange={e => set(c.subject, e.target.value)} /></label>
          <div className="flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!canEdit} checked={Number(values.status) === 1} onChange={e => set('status', e.target.checked ? 1 : 0)} /> Active template</label><span className="text-sm text-slate2">Sender managed in notification settings</span></div>
          {module === 'pscare-templates' && <div><span className="label">Category</span><LookupSelect lookup="emailCategory" value={values.emailcategoryID} onChange={v => set('emailcategoryID', v)} disabled={!canEdit} /></div>}
          <label className="block"><span className="label">Message HTML</span><textarea className="input min-h-[300px] font-mono text-sm leading-6" spellCheck={false} readOnly={!canEdit} value={body} onChange={e => set(c.body, e.target.value)} /></label>
          <div><h3 className="mb-2 text-sm font-semibold">Personalisation</h3><p className="mb-3 text-sm text-slate2">Use {'{{variable_name}}'} for recipient details. Existing ##VARIABLE## placeholders are supported.</p><div className="flex flex-wrap gap-2">{variables.map(v => <code key={v} className="rounded-md bg-blue-50 px-2 py-1 text-xs text-navy">{v}</code>)}{!variables.length && <span className="text-sm text-slate2">No variables in this message.</span>}</div></div>
          {canEdit && <div className="flex justify-end gap-2 border-t pt-4"><Link className="btn-outline" href={id ? `${base}/${id}` : base}>Cancel</Link><button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : <Save size={16} />} Save template</button></div>}
          {!editing && meta.can.edit && <ModuleActions module={module} row={values} reload={() => router.refresh()} />}
        </section>
        <section className="card overflow-hidden"><div className="flex items-center justify-between border-b p-5"><div><h2 className="text-lg font-semibold">Email preview</h2><p className="mt-1 text-sm text-slate2">Layout preview · variables remain visible</p></div><div className="flex gap-1"><button type="button" aria-label="Desktop preview" aria-pressed={!mobile} onClick={() => setMobile(false)} className={`rounded-lg p-2 ${!mobile ? 'bg-blue-50 text-navy' : 'text-slate2'}`}><Monitor size={19} /></button><button type="button" aria-label="Mobile preview" aria-pressed={mobile} onClick={() => setMobile(true)} className={`rounded-lg p-2 ${mobile ? 'bg-blue-50 text-navy' : 'text-slate2'}`}><Smartphone size={19} /></button></div></div><div className="border-b p-5 text-sm"><span className="text-slate2">Subject: </span>{values[c.subject] || 'Your email subject'}</div><div className="bg-[#F3F6FB] p-2"><iframe title="Atlis Cloud email preview" sandbox="" referrerPolicy="no-referrer" className="mx-auto h-[660px] w-full border-0 transition-all" style={{ maxWidth: mobile ? 375 : '100%' }} srcDoc={templatePreview(body)} /></div><p className="border-t px-5 py-3 text-xs text-slate2">Previewing and saving do not send an email. External images are hidden in preview.</p></section>
      </div>
    </form>}
  </>;
}
