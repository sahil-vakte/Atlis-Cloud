import Link from 'next/link';
import { getSettings } from '@/lib/settings';
export const dynamic = 'force-dynamic';
export default async function CareersLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <div className="min-h-screen bg-[#F4F6FB]">
      <header className="relative overflow-hidden bg-navy">
        <div className="dot-pattern absolute inset-0 opacity-30" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/careers"><img src={s.brand_logo_dark} alt={s.brand_name} className="h-8" /></Link>
          <Link href="/login" className="text-sm font-semibold text-[#B3C0DB] hover:text-white">Staff sign in</Link>
        </div>
      </header>
      {children}
      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-6 py-10 text-xs text-slate2"><span>© {new Date().getFullYear()} {s.brand_name} · {s.support_email}</span><span className="flex gap-4"><Link href="/register/client" className="hover:text-navy">Register as a client</Link><Link href="/register/vendor" className="hover:text-navy">Become a supply partner</Link></span></footer>
    </div>
  );
}
