import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveMenuHref } from '@/lib/modules';
import { PageHeader } from '@/components/ui';
export default function Legacy({ params }: { params: { slug: string[] } }) {
  const destination = resolveMenuHref(params.slug.join('/'));
  if (!destination.startsWith('/legacy/')) redirect(destination);
  return (
    <>
      <PageHeader title="This page has moved" sub={`The old “${params.slug.join('/')}” screen is part of a module in the new app.`} />
      <div className="card p-6 text-sm">Use the menu on the left, or <Link href="/masters" className="font-semibold text-navy underline">browse all modules</Link>. Administrators can point this menu entry at a new page by editing its link in Roles &amp; permissions.</div>
    </>
  );
}
