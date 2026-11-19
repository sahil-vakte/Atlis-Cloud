import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import '../landing.css';
import '../public-ui.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Open roles', description: 'Explore opportunities with Atlis Cloud. Find roles by technology, skills and location, and take the next step in your career.' };
export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return <div className="ac-site careers-site"><PublicNav careers />{children}<footer className="ac-footer ac-wrap"><Link href="/"><img src="/brand/atlis-cloud_logo_horizontal_navy.svg" alt="Atlis Cloud" width={145} height={34} /></Link><p>© {new Date().getFullYear()} Atlis Cloud</p><nav aria-label="Footer"><Link href="/">Platform</Link><Link href="/careers">Open roles</Link><Link href="/login">Sign in</Link></nav></footer></div>;
}
