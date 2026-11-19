import AuthFrame from '../../AuthFrame';
import Reset from './Reset';
export const metadata = { title: 'Choose a password' };
export const dynamic = 'force-dynamic';
export default function Page({ params, searchParams }: { params: { token: string }; searchParams: { welcome?: string } }) { return <AuthFrame><Reset token={params.token} welcome={!!searchParams.welcome} /></AuthFrame>; }
