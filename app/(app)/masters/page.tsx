import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MODULES } from '@/lib/modules';
import { getSession } from '@/lib/session';
import { canAccess } from '@/lib/permissions';
import { getTable } from '@/lib/schema';
import { PageHeader } from '@/components/ui';

export const metadata = { title: 'Masters' };
export default async function Masters() {
  const u = await getSession(); if (!u) redirect('/login');
  const groups = ['Masters', 'Clients & Vendors', 'CRM', 'PS Care', 'Finance', 'Workspace', 'Recruitment', 'Administration'];
  const visible = [];
  for (const m of MODULES) if (await canAccess(u, m)) visible.push(m);
  return (
    <>
      <PageHeader title="Masters & data" sub="Every list in atlis.cloud — dropdown values, reference data and all records — managed in one place. Nothing in the app is hardcoded." />
      <div className="space-y-6">
        {groups.map((g) => {
          const list = visible.filter((m) => m.group === g);
          if (!list.length) return null;
          return (
            <section key={g}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate2">{g}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((m) => (
                  <Link key={m.key} href={`/m/${m.key}`} className="card flex items-center justify-between px-4 py-3 transition hover:-translate-y-0.5 hover:border-navy">
                    <span className="text-sm font-semibold text-navy">{m.label}</span>
                    <span className="badge bg-navy-50 text-slate2">{getTable(m.table).approxRows.toLocaleString()}</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
