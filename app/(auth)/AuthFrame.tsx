import { getSettings } from '@/lib/settings';
export default async function AuthFrame({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-navy lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="dot-pattern absolute inset-0 opacity-40" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-[480px] w-[480px] rounded-full bg-[#576E9A]/30 blur-3xl" />
        <img src={s.brand_logo_dark} alt={s.brand_name} className="relative h-9 w-auto self-start" />
        <div className="relative max-w-lg">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">Hire, place and look after your consultants — in one place.</h1>
          <p className="mt-4 text-lg text-[#B3C0DB]">{s.brand_tagline}</p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[['Requirements', 'to placements'], ['CV parsing', 'on your own server'], ['PS Care', 'timesheets & invoices']].map(([a, b]) => (
              <div key={a} className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-bold text-white">{a}</p><p className="text-xs text-[#B3C0DB]">{b}</p></div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-[#B3C0DB]">© {new Date().getFullYear()} {s.brand_name}</p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <img src={s.brand_logo_light} alt={s.brand_name} className="mb-10 h-8 w-auto lg:hidden" />
          {children}
        </div>
      </div>
    </div>
  );
}
