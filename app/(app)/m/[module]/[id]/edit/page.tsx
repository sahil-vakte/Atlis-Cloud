'use client';
import { Suspense } from 'react';
import RecordForm from '@/components/RecordForm';
export default function Page({ params }: { params: { module: string; id: string } }) { return <Suspense><RecordForm module={params.module} id={params.id} /></Suspense>; }
