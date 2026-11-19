import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import NotificationEmails from './NotificationEmails';
export default async function Page() {
  const user = await getSession();
  if (!user || user.role !== 1) redirect('/dashboard');
  return <NotificationEmails readOnly={user.viewOnly} />;
}
