'use client';
import RecordDetail from '@/components/RecordDetail';
export default function Page({ params }: { params: { module: string; id: string } }) { return <RecordDetail module={params.module} id={params.id} />; }
