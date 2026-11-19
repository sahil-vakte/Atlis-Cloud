'use client';
import { Suspense } from 'react';
import RecordForm from '@/components/RecordForm';
export default function Page({ params }: { params: { module: string } }) { return <Suspense><RecordForm module={params.module} /></Suspense>; }
