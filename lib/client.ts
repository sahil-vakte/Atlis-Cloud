'use client';
export async function api<T = any>(url: string, opts: RequestInit & { json?: any } = {}): Promise<T> {
  const init: RequestInit = { ...opts, headers: { ...(opts.headers || {}) } };
  if (opts.json !== undefined) { init.body = JSON.stringify(opts.json); (init.headers as any)['content-type'] = 'application/json'; }
  const res = await fetch(url, init);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  if (res.status === 401 && typeof window !== 'undefined') { window.location.href = `/login?next=${encodeURIComponent(location.pathname)}`; }
  if (!res.ok) throw new Error((data as any)?.message || `Request failed (${res.status})`);
  return data as T;
}
export function qs(o: Record<string, any>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString(); return s ? `?${s}` : '';
}
export const fileUrl = (v: string) => (v && v.includes('/') ? `/api/files/${v.split('/').map(encodeURIComponent).join('/')}` : '');
export const recordFileUrl = (module: string, id: any, col: string) => `/api/files/record/${encodeURIComponent(module)}/${encodeURIComponent(String(id))}/${encodeURIComponent(col)}`;
export function fmtDate(v: any) {
  if (!v || String(v).startsWith('0000') || /^1970-01-0[12]/.test(String(v)) || String(v).toUpperCase() === 'NULL') return '';
  const s = String(v);
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s.replace(' ', 'T'));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + (s.length > 10 && !s.endsWith('00:00:00') ? ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');
}
export const stripHtml = (s: any) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
