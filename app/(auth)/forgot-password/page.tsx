import AuthFrame from '../AuthFrame';
import Forgot from './Forgot';
export const metadata = { title: 'Reset password' };
export const dynamic = 'force-dynamic';
export default function Page() { return <AuthFrame><Forgot /></AuthFrame>; }
