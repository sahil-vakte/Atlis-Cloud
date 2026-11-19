import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
export const dynamic = 'force-dynamic';
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSession())) redirect('/login');
  return <div className="min-h-screen bg-[#E9EDF5] py-8 print:bg-white print:py-0">{children}</div>;
}
