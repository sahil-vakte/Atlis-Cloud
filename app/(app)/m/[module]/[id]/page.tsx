'use client';
import RecordDetail from '@/components/RecordDetail';
import EmailTemplates, { isEmailTemplates } from '@/components/EmailTemplates';
export default function Page({ params }: { params: { module: string; id: string } }) { return isEmailTemplates(params.module) ? <EmailTemplates key={`${params.module}/${params.id}`} module={params.module} id={params.id} /> : <RecordDetail module={params.module} id={params.id} />; }
