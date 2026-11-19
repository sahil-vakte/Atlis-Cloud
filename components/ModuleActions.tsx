'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import * as L from './icons';
import { api, recordFileUrl, fmtDate } from '@/lib/client';
import { LookupSelect } from './fields';
import { Empty, Loading, Modal, Spinner, StatusBadge, useToast } from './ui';

const VERIFY = new Set(['timesheets', 'invoices', 'expenses', 'expense-lines', 'client-invoices', 'candidate-documents', 'company-documents', 'sub-vendor-documents']);

export default function ModuleActions({ module, row, reload }: { module: string; row: any; reload: () => void }) {
  const toast = useToast();
  const [modal, setModal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const run = async (fn: () => Promise<any>, after?: () => void) => {
    setBusy(true);
    try { const r = await fn(); toast('success', r?.message || 'Done'); if (r?.link) prompt('Copy this activation link for the consultant:', r.link); setModal(null); setForm({}); reload(); after?.(); }
    catch (e: any) { toast('error', e.message); } finally { setBusy(false); }
  };
  const id = row.sID ?? row.rID ?? row.pID ?? row.cdID ?? row.id;
  const close = () => { setModal(null); setForm({}); };
  const buttons: React.ReactNode[] = [];

  if (module === 'sourcing' && Number(row.submitted) !== 1) buttons.push(<button key="sub" className="btn-accent" disabled={busy} onClick={() => run(() => api(`/api/workflow/sourcing/${row.sID}/submit`, { method: 'POST' }))}><L.Send className="h-4 w-4" /> Submit candidate</button>);
  if (module === 'sourcing' || module === 'submissions') buttons.push(<button key="st" className="btn-outline" onClick={() => { setForm({ pStatusID: row.pStatusID || '', cStatusID: row.cStatusID || '', rejectionStage: row.rejectionStage || '' }); setModal('status'); }}><L.RefreshCw className="h-4 w-4" /> Update status</button>);
  if (module === 'sourcing' || module === 'submissions') {
    buttons.push(<button key="rtr" className="btn-outline" disabled={busy} title={Number(row.isRTRreceived) ? 'RTR received' : 'Ask the candidate to confirm the right to represent'} onClick={() => run(() => api(`/api/workflow/sourcing/${row.sID}/request-rtr`, { method: 'POST' }))}><L.FileSignature className="h-4 w-4" /> {Number(row.isRTRreceived) ? 'RTR received ✓' : 'Request RTR'}</button>);
    buttons.push(<button key="gdpr" className="btn-outline" disabled={busy} onClick={() => run(() => api(`/api/workflow/sourcing/${row.sID}/request-gdpr`, { method: 'POST' }))}><L.ShieldCheck className="h-4 w-4" /> {Number(row.isGDPRconfirm) ? 'GDPR ✓' : 'Request GDPR consent'}</button>);
    buttons.push(<a key="mask" className="btn-outline" href={`/print/masked-cv/${row.sID}`} target="_blank"><L.EyeOff className="h-4 w-4" /> Masked CV</a>);
  }
  if (module === 'submissions') buttons.push(<button key="stc" className="btn-accent" onClick={() => setModal('client')}><L.Mail className="h-4 w-4" /> {String(row.isSentToClient) === '1' ? 'Send again' : 'Send to client'}</button>);
  if (module === 'requirements') buttons.push(<button key="tog" className="btn-outline" disabled={busy} onClick={() => run(() => api(`/api/workflow/requirements/${row.rID}/status`, { method: 'POST', json: { active: Number(row.active) !== 1, reqStatusID: row.reqStatusID } }))}>{Number(row.active) === 1 ? <><L.CircleSlash className="h-4 w-4" /> Mark inactive</> : <><L.CircleCheck className="h-4 w-4" /> Reopen</>}</button>);
  if (module === 'profiles') {
    if (row.resumeName) buttons.push(<a key="cv" className="btn-outline" href={recordFileUrl('profiles', row.pID, 'resumeName')} target="_blank"><L.FileText className="h-4 w-4" /> CV</a>);
    buttons.push(<button key="add" className="btn-outline" onClick={() => setModal('addReq')}><L.ListPlus className="h-4 w-4" /> Add to requirement</button>);
    buttons.push(<button key="re" className="btn-outline" onClick={() => setModal('reparse')}><L.ScanText className="h-4 w-4" /> Update from CV</button>);
  }
  if (module === 'consultants') buttons.push(<button key="act" className="btn-accent" disabled={busy} onClick={() => run(() => api(`/api/workflow/consultants/${row.cdID}/activate`, { method: 'POST' }))}><L.UserCheck className="h-4 w-4" /> {Number(row.isActivationMailSent) ? 'Resend portal invite' : 'Send portal invite'}</button>);
  if (VERIFY.has(module)) {
    buttons.push(<button key="ap" className="btn-accent" disabled={busy} onClick={() => run(() => api(`/api/workflow/verify/${module}/${id}`, { method: 'POST', json: { status: 'approved' } }))}><L.Check className="h-4 w-4" /> Approve</button>);
    buttons.push(<button key="rj" className="btn-outline text-red-700" onClick={() => setModal('reject')}><L.X className="h-4 w-4" /> Reject</button>);
  }
  if (module === 'email-templates' || module === 'pscare-templates') buttons.push(<button key="se" className="btn-accent" onClick={() => setModal('email')}><L.Send className="h-4 w-4" /> Send email</button>);
  if (module === 'users') buttons.push(<button key="pw" className="btn-outline" onClick={() => setModal('password')}><L.KeyRound className="h-4 w-4" /> Set password</button>);

  return (
    <>
      {buttons}
      <Modal open={modal === 'status'} onClose={close} title="Update candidate status"
        footer={<button className="btn-primary" disabled={busy} onClick={() => run(() => api(`/api/workflow/sourcing/${row.sID}/status`, { method: 'POST', json: form }))}>{busy && <Spinner />} Save</button>}>
        <div className="space-y-3">
          <div><label className="label">Profile status</label><LookupSelect lookup="profileStatus" value={form.pStatusID} onChange={(v) => set('pStatusID', v)} /></div>
          <div><label className="label">Call status</label><LookupSelect lookup="callStatus" value={form.cStatusID} onChange={(v) => set('cStatusID', v)} /></div>
          <div><label className="label">Rejection stage</label><LookupSelect lookup="rejection" value={form.rejectionStage} onChange={(v) => set('rejectionStage', v)} /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Interview date</label><input type="datetime-local" className="input" onChange={(e) => set('interviewDateTime', e.target.value)} /></div>
            <div><label className="label">Comment type</label><LookupSelect lookup="opt:comment_type" value={form.commentType} onChange={(v) => set('commentType', v)} /></div></div>
          <div><label className="label">Feedback / comment</label><textarea className="input min-h-[90px]" onChange={(e) => set('comment', e.target.value)} /></div>
        </div>
      </Modal>
      <Modal open={modal === 'client'} onClose={close} title="Send submission to client" wide
        footer={<button className="btn-primary" disabled={busy} onClick={() => run(() => api(`/api/workflow/sourcing/${row.sID}/send-to-client`, { method: 'POST', json: { ...form, pocIds: String(form.pocIds || '').split(',').filter(Boolean) } }))}>{busy && <Spinner />} <L.Send className="h-4 w-4" /> Send</button>}>
        <div className="space-y-3">
          <div><label className="label">Client contacts (POCs)</label><LookupSelect lookup="poc" multi value={form.pocIds} onChange={(v) => set('pocIds', v)} /></div>
          <div><label className="label">Other recipients</label><input className="input" placeholder="name@client.com, …" onChange={(e) => set('to', e.target.value)} /></div>
          <div><label className="label">CC</label><input className="input" onChange={(e) => set('cc', e.target.value)} /></div>
          <div><label className="label">Subject</label><input className="input" defaultValue={`Candidate submission: ${row.sourcingName || ''}`} onChange={(e) => set('subject', e.target.value)} /></div>
          <div><label className="label">Message</label><textarea className="input min-h-[140px]" defaultValue={`Hello,\n\nPlease find attached the profile of ${row.sourcingName || 'the candidate'} for your review.\n\nKind regards`} onChange={(e) => set('message', e.target.value.replace(/\n/g, '<br>'))} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked onChange={(e) => set('attachCv', e.target.checked)} /> Attach the candidate's CV</label>
        </div>
      </Modal>
      <Modal open={modal === 'reject'} onClose={close} title="Reject"
        footer={<button className="btn-danger" disabled={busy} onClick={() => run(() => api(`/api/workflow/verify/${module}/${id}`, { method: 'POST', json: { status: 'rejected', remark: form.remark } }))}>{busy && <Spinner />} Reject</button>}>
        <label className="label">Reason (shared with the submitter)</label><textarea className="input min-h-[100px]" onChange={(e) => set('remark', e.target.value)} />
      </Modal>
      <Modal open={modal === 'email'} onClose={close} title="Send this template" wide
        footer={<button className="btn-primary" disabled={busy} onClick={() => run(() => api('/api/workflow/send-email', { method: 'POST', json: { kind: module === 'pscare-templates' ? 'pscare' : 'general', templateId: row.templateID ?? row.email_template_id, recipients: String(form.to || '').split(/[,;\n]/).map((s: string) => s.trim()).filter(Boolean), cc: form.cc, bcc: form.bcc, variables: safeJson(form.vars) } }))}>{busy && <Spinner />} Send</button>}>
        <div className="space-y-3">
          <div><label className="label">Recipients</label><textarea className="input" placeholder="One email per line or comma-separated" onChange={(e) => set('to', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">CC</label><input className="input" onChange={(e) => set('cc', e.target.value)} /></div><div><label className="label">BCC</label><input className="input" onChange={(e) => set('bcc', e.target.value)} /></div></div>
          <div><label className="label">Variables (JSON, optional)</label><textarea className="input font-mono text-xs" placeholder='{"candidate_name":"Jane"}' onChange={(e) => set('vars', e.target.value)} />
            <p className="mt-1 text-xs text-slate2">Placeholders such as {'{{candidate_name}}'} in the template are replaced with these values.</p></div>
        </div>
      </Modal>
      <Modal open={modal === 'password'} onClose={close} title="Set a new password"
        footer={<button className="btn-primary" disabled={busy} onClick={() => run(() => api(`/api/users/${row.id}/password`, { method: 'POST', json: { password: form.password } }))}>{busy && <Spinner />} Save</button>}>
        <label className="label">New password</label><input type="password" className="input" onChange={(e) => set('password', e.target.value)} />
        <p className="mt-2 text-xs text-slate2">At least 8 characters with upper- and lower-case letters and a number. The user is asked to change it at next sign-in.</p>
      </Modal>
      <Modal open={modal === 'addReq'} onClose={close} title="Add to a requirement"
        footer={<button className="btn-primary" disabled={busy || !form.rID} onClick={() => run(() => api(`/api/workflow/requirements/${form.rID}/add-profiles`, { method: 'POST', json: { profileIds: [row.pID] } }))}>{busy && <Spinner />} Add to sourcing</button>}>
        <label className="label">Requirement</label><LookupSelect lookup="requirement" value={form.rID} onChange={(v) => set('rID', v)} />
      </Modal>
      {modal === 'reparse' && <ReparseModal profile={row} onClose={close} onDone={() => { close(); reload(); }} />}
    </>
  );
}
const safeJson = (s: any) => { try { return s ? JSON.parse(s) : {}; } catch { return {}; } };

function ReparseModal({ profile, onClose, onDone }: { profile: any; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const upload = async (f: File) => {
    setBusy(true);
    const fd = new FormData(); fd.append('files', f);
    try { const r = await api('/api/cv/parse', { method: 'POST', body: fd }); if (!r.results[0].ok) throw new Error(r.results[0].error); setRes(r.results[0]); } catch (e: any) { toast('error', e.message); } finally { setBusy(false); }
  };
  const apply = async () => {
    setBusy(true);
    try { await api('/api/cv/create-profile', { method: 'POST', json: { data: res.data, file: res.file, updateProfileId: profile.pID, overrides: { name: profile.name } } }); toast('success', 'Profile updated from the new CV'); onDone(); }
    catch (e: any) { toast('error', e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Update profile from a new CV" wide footer={res && <button className="btn-primary" disabled={busy} onClick={apply}>{busy && <Spinner />} Apply to profile</button>}>
      {!res ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#C9D3E6] py-12 text-center hover:border-navy">
          {busy ? <Spinner className="h-6 w-6" /> : <L.UploadCloud className="h-8 w-8 text-slate2" />}<span className="mt-2 text-sm font-semibold text-navy">Choose the new CV</span>
          <span className="text-xs text-slate2">PDF, Word, RTF, ODT, text or image</span>
          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      ) : <ParsedSummary data={res.data} />}
    </Modal>
  );
}

export function ParsedSummary({ data }: { data: any }) {
  const row = (k: string, v: any) => v ? <div className="grid grid-cols-[140px_1fr] gap-2 py-1 text-sm"><span className="text-slate2">{k}</span><span>{v}</span></div> : null;
  return (
    <div>
      {row('Name', data.name)}{row('Email', data.emails.join(', '))}{row('Phone', data.phones.map((p: any) => p.e164).join(', '))}{row('Location', data.location.formatted)}
      {row('Current role', [data.designation, data.currentCompany].filter(Boolean).join(' at '))}{row('Experience', data.totalYearsExperience != null && `${data.totalYearsExperience} years`)}
      {row('Skills', data.skills.slice(0, 25).join(', '))}
    </div>
  );
}

// ---------- extra tabs on detail pages
export function ExtraTabs(module: string, row: any): { key: string; label: string; render: () => React.ReactNode }[] {
  if (module === 'requirements') return [
    { key: 'recommend', label: 'Recommended profiles', render: () => <Recommendations rID={row.rID} /> },
    { key: 'pipeline', label: 'Pipeline', render: () => <ReqPipeline rID={row.rID} /> },
  ];
  if (module === 'profiles' && row.resumeName && /\.pdf$/i.test(row.resumeName)) return [
    { key: 'cv', label: 'CV preview', render: () => <iframe src={recordFileUrl('profiles', row.pID, 'resumeName')} className="card h-[80vh] w-full" /> },
  ];
  return [];
}

function Recommendations({ rID }: { rID: number }) {
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const load = () => api(`/api/workflow/requirements/${rID}/recommendations`).then(setData).catch((e) => toast('error', e.message));
  useEffect(() => { load(); }, [rID]); // eslint-disable-line
  if (!data) return <Loading label="Matching profiles…" />;
  const add = async () => {
    setBusy(true);
    try { const r = await api(`/api/workflow/requirements/${rID}/add-profiles`, { method: 'POST', json: { profileIds: [...sel] } }); toast('success', r.message); setSel(new Set()); load(); } catch (e: any) { toast('error', e.message); } finally { setBusy(false); }
  };
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E6EBF4] px-4 py-3">
        <p className="text-sm text-slate2">Matched on: {data.requirementSkills?.length ? data.requirementSkills.slice(0, 15).map((s: string) => <span key={s} className="chip mr-1">{s}</span>) : 'no skills found on this requirement — add skills to get recommendations'}</p>
        <button className="btn-primary btn-sm ml-auto" disabled={!sel.size || busy} onClick={add}>{busy && <Spinner className="h-3 w-3" />}<L.ListPlus className="h-4 w-4" /> Add {sel.size || ''} to sourcing</button>
      </div>
      {!data.profiles?.length ? <Empty title="No matching profiles" text="Profiles are matched on their skill set. Parse more CVs to grow the talent pool." /> : (
        <table className="w-full"><thead className="bg-[#F8FAFD]"><tr><th className="th w-8" /><th className="th">Match</th><th className="th">Candidate</th><th className="th">Designation</th><th className="th">Location</th><th className="th">Matching skills</th></tr></thead>
          <tbody className="divide-y divide-[#EEF2F8]">{data.profiles.map((p: any) => (
            <tr key={p.pID} className="hover:bg-[#F8FAFD]">
              <td className="td">{p.alreadySourced ? <L.CheckCircle2 className="h-4 w-4 text-teal-700" /> : <input type="checkbox" checked={sel.has(p.pID)} onChange={(e) => { const s = new Set(sel); e.target.checked ? s.add(p.pID) : s.delete(p.pID); setSel(s); }} />}</td>
              <td className="td"><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-navy-50"><div className="h-full bg-teal" style={{ width: `${p.score}%` }} /></div><span className="text-xs font-bold text-navy">{p.score}%</span></div></td>
              <td className="td"><Link href={`/m/profiles/${p.pID}`} className="font-semibold text-navy hover:underline">{p.name}</Link><div className="text-xs text-slate2">{p.primaryEmail}</div></td>
              <td className="td">{p.designationName}</td><td className="td">{p.currentLocation || p.city}</td>
              <td className="td">{p.matched.slice(0, 8).map((s: string) => <span key={s} className="chip mb-1 mr-1">{s}</span>)}</td>
            </tr>))}</tbody></table>
      )}
    </div>
  );
}

function ReqPipeline({ rID }: { rID: number }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { api(`/api/workflow/requirements/${rID}/pipeline`).then(setRows).catch(() => setRows([])); }, [rID]);
  if (!rows) return <Loading />;
  const stages = [
    { k: 'Sourced', f: (r: any) => Number(r.submitted) !== 1 }, { k: 'Submitted', f: (r: any) => Number(r.submitted) === 1 && String(r.isSentToClient) !== '1' }, { k: 'With client', f: (r: any) => String(r.isSentToClient) === '1' },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {stages.map((s) => { const list = rows.filter(s.f); return (
        <div key={s.k} className="card p-3">
          <div className="mb-2 flex items-center justify-between px-1"><h3 className="text-sm font-bold text-navy">{s.k}</h3><span className="badge bg-navy-50 text-navy">{list.length}</span></div>
          <div className="space-y-2">{list.map((r) => (
            <Link key={r.sID} href={`/m/${Number(r.submitted) === 1 ? 'submissions' : 'sourcing'}/${r.sID}`} className="block rounded-xl border border-[#E6EBF4] p-3 hover:border-navy">
              <p className="text-sm font-semibold text-navy">{r.name || r.sourcingName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate2">{r.profileStatus && <StatusBadge value={r.profileStatus} />}{r.callStatus && <span>{r.callStatus}</span>}<span>{fmtDate(r.created_at)}</span></div>
            </Link>))}
            {!list.length && <p className="px-1 py-6 text-center text-xs text-slate2">Nobody at this stage</p>}</div>
        </div>); })}
    </div>
  );
}
