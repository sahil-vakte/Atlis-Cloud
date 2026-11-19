import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
export default async function Me() {
  const u = await getSession(); if (!u) redirect('/login');
  if (u.profileID) redirect(`/m/profiles/${u.profileID}`);
  redirect('/account');
}
