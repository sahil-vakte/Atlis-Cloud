'use client';
import { Suspense } from 'react';
import RecordForm from '@/components/RecordForm';
import EmailTemplates, { isEmailTemplates } from '@/components/EmailTemplates';
export default function Page({ params }: { params: { module: string; id: string } }) { return isEmailTemplates(params.module) ? <EmailTemplates key={`${params.module}/${params.id}`} module={params.module} id={params.id} editing /> : <Suspense><RecordForm module={params.module} id={params.id} /></Suspense>; }
