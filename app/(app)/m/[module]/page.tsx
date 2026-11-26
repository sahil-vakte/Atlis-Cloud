import { notFound } from 'next/navigation';
import { getModule } from '@/lib/modules';
import ModuleList from './ModuleList';
import EmailTemplates from '@/components/EmailTemplates';
export async function generateMetadata({ params }: { params: { module: string } }) { return { title: getModule(params.module)?.label || 'Not found' }; }
export default function Page({ params }: { params: { module: string } }) {
  const m = getModule(params.module); if (!m) notFound();
  if (['email-templates', 'pscare-templates'].includes(m.key)) return <EmailTemplates key={m.key} module={m.key} />;
  return <ModuleList module={m.key} label={m.label} group={m.group} />;
}
