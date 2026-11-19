'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as L from './icons';
import clsx from 'clsx';
import { api } from '@/lib/client';
import { Icon, ToastProvider } from './ui';

type MenuItem = { id: number; label: string; icon: string; href: string; children: { id: number; label: string; href: string }[] };
type Brand = { brand_name: string; brand_logo_dark: string; brand_icon: string };
export type ShellUser = { id: number; name: string; email: string; role: number; roleTitle: string };

const ADMIN_LINKS = [
  { href: '/admin/notification-emails', label: 'Notification emails', icon: 'Mail' },
  { href: '/cv-parser', label: 'CV Parser', icon: 'ScanText' }, { href: '/reports', label: 'Reports', icon: 'BarChart3' }, { href: '/masters', label: 'Masters', icon: 'Settings2' },
  { href: '/m/users', label: 'Users', icon: 'UserCog' }, { href: '/roles', label: 'Roles & permissions', icon: 'ShieldCheck' }, { href: '/settings', label: 'Settings', icon: 'Settings' },
];

export default function Shell({ user, brand, children }: { user: ShellUser; brand: Brand; children: ReactNode }) {
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  useEffect(() => { api<{ items: MenuItem[] }>('/api/menu').then((r) => setMenu(r.items)).catch(() => setMenu([])); }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => { try { setCollapsed(localStorage.getItem('atlis_nav') === '1'); } catch {} }, []);
  const toggle = () => { setCollapsed((c) => { try { localStorage.setItem('atlis_nav', c ? '0' : '1'); } catch {} return !c; }); };

  const active = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/')) || pathname.startsWith(href + '?');
  const menuHrefs = new Set((menu || []).flatMap((m) => [m.href, ...m.children.map((c) => c.href)]));
  const extra = user.role === 1 ? ADMIN_LINKS.filter((l) => !menuHrefs.has(l.href)) : [];

  const nav = (
    <nav className="flex h-full flex-col">
      <div className={clsx('flex h-16 shrink-0 items-center border-b border-white/10', collapsed ? 'justify-center px-2' : 'px-5')}>
        <Link href="/dashboard" className="flex items-center">
          {collapsed ? <img src="/brand/atlis-cloud_icon_reversed.svg" alt={brand.brand_name} className="h-8 w-8" /> : <img src={brand.brand_logo_dark} alt={brand.brand_name} className="h-7 w-auto" />}
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {!menu && <div className="space-y-2 px-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-white/5" />)}</div>}
        <ul className="space-y-0.5">
          {menu?.map((m) => (
            <li key={m.id}>
              <Link href={m.href} title={m.label} className={clsx('group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition', active(m.href) ? 'bg-white/10 text-white' : 'text-[#B3C0DB] hover:bg-white/5 hover:text-white', collapsed && 'justify-center px-0')}>
                <span className={clsx('grid h-7 w-7 place-items-center rounded-md', active(m.href) ? 'bg-teal text-navy-900' : 'text-[#B3C0DB] group-hover:text-white')}><Icon name={m.icon} className="h-4 w-4" /></span>
                {!collapsed && <span className="truncate">{m.label}</span>}
              </Link>
              {!collapsed && m.children.length > 0 && (
                <ul className="ml-10 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                  {m.children.map((c) => <li key={c.id}><Link href={c.href} className={clsx('block rounded-md px-2 py-1 text-[13px]', active(c.href) ? 'text-teal' : 'text-[#B3C0DB] hover:text-white')}>{c.label}</Link></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
        {extra.length > 0 && (
          <>
            {!collapsed && <p className="mb-1 mt-5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">Administration</p>}
            <ul className="space-y-0.5">
              {extra.map((m) => (
                <li key={m.href}><Link href={m.href} title={m.label} className={clsx('group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium', active(m.href) ? 'bg-white/10 text-white' : 'text-[#B3C0DB] hover:bg-white/5 hover:text-white', collapsed && 'justify-center px-0')}>
                  <span className={clsx('grid h-7 w-7 place-items-center rounded-md', active(m.href) && 'bg-teal text-navy-900')}><Icon name={m.icon} className="h-4 w-4" /></span>{!collapsed && m.label}</Link></li>
              ))}
            </ul>
          </>
        )}
      </div>
      <button onClick={toggle} className="hidden h-11 shrink-0 items-center justify-center gap-2 border-t border-white/10 text-xs text-[#B3C0DB] hover:text-white lg:flex">
        {collapsed ? <L.ChevronsRight className="h-4 w-4" /> : <><L.ChevronsLeft className="h-4 w-4" /> Collapse</>}
      </button>
    </nav>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen">
        <aside className={clsx('fixed inset-y-0 left-0 z-40 hidden bg-navy transition-all lg:block', collapsed ? 'w-[76px]' : 'w-[256px]')}>{nav}</aside>
        {open && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-navy-900/50" onClick={() => setOpen(false)} /><aside className="absolute inset-y-0 left-0 w-[270px] bg-navy">{nav}</aside></div>}
        <div className={clsx('transition-all', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[256px]')}>
          <TopBar user={user} onMenu={() => setOpen(true)} />
          <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}

function TopBar({ user, onMenu }: { user: ShellUser; onMenu: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<any[] | null>(null);
  const [userMenu, setUserMenu] = useState(false);
  const [notes, setNotes] = useState<{ items: any[]; unread: number } | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    const t = setTimeout(() => api(`/api/search?q=${encodeURIComponent(q)}`).then((r) => setRes(r.groups)).catch(() => setRes([])), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => { api('/api/notifications').then(setNotes).catch(() => {}); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setRes(null); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }); router.push('/login'); };
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#E6EBF4] bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button className="btn-ghost lg:hidden" onClick={onMenu} aria-label="Open menu"><L.Menu className="h-5 w-5" /></button>
      <div ref={box} className="relative w-full max-w-xl">
        <L.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate2" />
        <input className="input h-10 rounded-xl bg-[#F4F6FB] pl-9" placeholder="Search candidates, requirements, clients…" value={q} onChange={(e) => setQ(e.target.value)} />
        {res && (
          <div className="card absolute left-0 right-0 top-12 max-h-[70vh] overflow-y-auto p-2">
            {res.length === 0 && <p className="px-3 py-4 text-sm text-slate2">No matches for “{q}”.</p>}
            {res.map((g) => (
              <div key={g.module} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate2">{g.label}</p>
                {g.items.map((it: any) => (
                  <Link key={it.id} href={`/m/${g.module}/${it.id}`} onClick={() => { setRes(null); setQ(''); }} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-navy-50">
                    <span className="font-medium text-navy">{it.title}</span><span className="truncate pl-3 text-xs text-slate2">{it.sub}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <div className="relative">
          <button className="btn-ghost relative" onClick={() => { setShowNotes((s) => !s); if (notes?.unread) api('/api/notifications', { method: 'POST' }).then(() => setNotes((n) => n && { ...n, unread: 0 })); }} aria-label="Notifications">
            <L.Bell className="h-5 w-5" />
            {!!notes?.unread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-teal" />}
          </button>
          {showNotes && (
            <div className="card absolute right-0 top-12 w-[340px] p-2">
              <p className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate2">Notifications</p>
              {!notes?.items.length && <p className="px-3 pb-4 text-sm text-slate2">You're all caught up.</p>}
              <div className="max-h-96 overflow-y-auto">
                {notes?.items.map((n) => <div key={n.id} className="rounded-lg px-3 py-2 text-sm hover:bg-navy-50"><p className="text-[#0B1B3F]">{n.description}</p><p className="text-xs text-slate2">{n.type} · {String(n.created_at).slice(0, 10)}</p></div>)}
              </div>
            </div>
          )}
        </div>
        <div className="relative">
          <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-navy-50" onClick={() => setUserMenu((s) => !s)}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-xs font-bold text-white">{initials}</span>
            <span className="hidden text-left sm:block"><span className="block text-sm font-semibold leading-tight text-navy">{user.name}</span><span className="block text-xs text-slate2">{user.roleTitle}</span></span>
            <L.ChevronDown className="h-4 w-4 text-slate2" />
          </button>
          {userMenu && (
            <div className="card absolute right-0 top-14 w-56 p-1.5" onMouseLeave={() => setUserMenu(false)}>
              <Link href="/account" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-navy-50"><L.KeyRound className="h-4 w-4" /> Account & password</Link>
              <Link href="/help" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-navy-50"><L.LifeBuoy className="h-4 w-4" /> Help</Link>
              <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"><L.LogOut className="h-4 w-4" /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
