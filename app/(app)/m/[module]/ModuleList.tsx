'use client';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/ui';
import Link from 'next/link';
import * as L from '@/components/icons';
export default function ModuleList({ module, label, group }: { module: string; label: string; group: string }) {
  return (
    <>
      <PageHeader crumbs={group} title={label} actions={module === 'profiles' ? <Link href="/cv-parser" className="btn-accent"><L.ScanText className="h-4 w-4" /> Add from CVs</Link> : undefined} />
      <DataTable module={module} />
    </>
  );
}
