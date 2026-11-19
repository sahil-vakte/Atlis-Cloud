import AuthFrame from '../AuthFrame';
import LoginForm from './LoginForm';
export const metadata = { title: 'Sign in', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
export default function Page() { return <AuthFrame><Suspense><LoginForm /></Suspense></AuthFrame>; }
