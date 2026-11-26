'use client';
import { Suspense } from 'react';
import RecordForm from '@/components/RecordForm';
import EmailTemplates, { isEmailTemplates } from '@/components/EmailTemplates';
export default function Page({ params }: { params: { module: string } }) { return isEmailTemplates(params.module) ? <EmailTemplates key={params.module} module={params.module} editing /> : <Suspense><RecordForm module={params.module} /></Suspense>; }
