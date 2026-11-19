import { notFound } from 'next/navigation';
import { getModule } from '@/lib/modules';
import ModuleList from './ModuleList';
export async function generateMetadata({ params }: { params: { module: string } }) { return { title: getModule(params.module)?.label || 'Not found' }; }
export default function Page({ params }: { params: { module: string } }) {
  const m = getModule(params.module); if (!m) notFound();
  return <ModuleList module={m.key} label={m.label} group={m.group} />;
}
