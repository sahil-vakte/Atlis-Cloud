import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getSettings } from '@/lib/settings';
import { one } from '@/lib/db';
import Shell from '@/components/Shell';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await getSession();
  if (!u) redirect('/login');
  const [s, role] = await Promise.all([getSettings(), one<{ title: string }>('SELECT title FROM roles WHERE id=?', [u.role])]);
  return <Shell user={{ ...u, roleTitle: role?.title || '' }} brand={{ brand_name: s.brand_name, brand_logo_dark: s.brand_logo_dark, brand_icon: s.brand_icon }}>{children}</Shell>;
}
