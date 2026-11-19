'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as L from './icons';
import clsx from 'clsx';

// ---------- toasts
type Toast = { id: number; kind: 'success' | 'error' | 'info'; text: string };
const ToastCtx = createContext<(kind: Toast['kind'], text: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((a) => [...a, { id, kind, text }]);
    setTimeout(() => setItems((a) => a.filter((t) => t.id !== id)), kind === 'error' ? 7000 : 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[92vw] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={clsx('card flex items-start gap-3 px-4 py-3 text-sm', t.kind === 'error' && 'border-red-200')}>
            {t.kind === 'success' ? <L.CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" /> : t.kind === 'error' ? <L.AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /> : <L.Info className="mt-0.5 h-4 w-4 shrink-0 text-navy" />}
            <span className="flex-1">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ---------- modal
export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean | 'xl'; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-navy-900/40 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={clsx('card my-8 w-full', wide === 'xl' ? 'max-w-6xl' : wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between border-b border-[#E6EBF4] px-5 py-3.5">
          <h3 className="text-base font-bold text-navy">{title}</h3>
          <button className="btn-ghost btn-sm" onClick={onClose} aria-label="Close"><L.X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[#E6EBF4] px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{ text: string; resolve: (v: boolean) => void; danger?: boolean } | null>(null);
  const confirm = (text: string, danger = true) => new Promise<boolean>((resolve) => setState({ text, resolve, danger }));
  const node = (
    <Modal open={!!state} onClose={() => { state?.resolve(false); setState(null); }} title="Please confirm"
      footer={<><button className="btn-outline" onClick={() => { state?.resolve(false); setState(null); }}>Cancel</button>
        <button className={state?.danger ? 'btn-danger' : 'btn-primary'} onClick={() => { state?.resolve(true); setState(null); }}>Confirm</button></>}>
      <p className="text-sm">{state?.text}</p>
    </Modal>
  );
  return { confirm, node };
}

export const Spinner = ({ className }: { className?: string }) => <L.Loader2 className={clsx('h-4 w-4 animate-spin', className)} />;
export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate2"><Spinner /> {label}</div>;
}
export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-navy-50"><L.Inbox className="h-6 w-6 text-slate2" /></div>
      <p className="font-semibold text-navy">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate2">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const GOOD = /^(active|yes|approved|joined|completed|selected|open|submitted|sent|1)$/i;
const BAD = /^(inactive|no|rejected|backout|abscond|cancel|position cancel|closed|position close|0)$/i;
const WARN = /^(pending|awaiting|in-progress|in progress|incomplete|scheduled|shortlisted|on hold)$/i;
export function StatusBadge({ value }: { value: any }) {
  const v = String(value ?? '').trim();
  if (!v) return <span className="text-slate2/50">—</span>;
  const cls = GOOD.test(v) ? 'bg-teal-50 text-teal-700' : BAD.test(v) ? 'bg-red-50 text-red-700' : WARN.test(v) ? 'bg-amber-50 text-amber-700' : 'bg-navy-50 text-navy';
  return <span className={clsx('badge', cls)}>{v === '1' ? 'Yes' : v === '0' ? 'No' : v}</span>;
}

// Font Awesome names stored in `permissions.icon` → lucide icons
const ICONS: Record<string, string> = {
  home: 'LayoutDashboard', 'handshake-o': 'Handshake', edit: 'ClipboardList', user: 'UserRound', search: 'Search', 'files-o': 'Send', 'product-hunt': 'GitBranch',
  database: 'BookOpen', users: 'Users', 'pencil-square-o': 'Megaphone', 'building-o': 'Building2', calendar: 'CalendarDays', 'file-text-o': 'Receipt', 'user-o': 'CircleUserRound',
  'question-circle': 'LifeBuoy', history: 'History', cogs: 'Settings2', money: 'Wallet', 'comments-o': 'MessagesSquare', 'bar-chart': 'BarChart3', 'file-search': 'ScanText',
  'users-cog': 'UserCog', shield: 'ShieldCheck', settings: 'Settings', 'list-checks': 'ListChecks', mail: 'Mail', '1': 'Circle',
};
export function Icon({ name, className }: { name?: string | null; className?: string }) {
  const key = (name && (ICONS[name] || (name in L ? name : undefined))) || 'Circle';
  const C = (L as any)[key] || L.Circle;
  return <C className={clsx('h-[18px] w-[18px]', className)} />;
}

export function PageHeader({ title, sub, actions, crumbs }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; crumbs?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {crumbs && <div className="mb-1 text-xs font-medium text-slate2">{crumbs}</div>}
        <h1 className="text-2xl font-extrabold tracking-tight text-navy">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-slate2">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
