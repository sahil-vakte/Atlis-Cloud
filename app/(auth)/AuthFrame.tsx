import Link from 'next/link';
import { ShieldCheck, Users, BriefcaseBusiness, BarChart3 } from 'lucide-react';
import './auth.css';
export default function AuthFrame({ children }: { children: React.ReactNode }) {
  return <div className="auth-experience auth-v2">
    <aside className="auth-story">
      <Link href="/" className="auth-brand"><img src="/brand/atlis-cloud_logo_horizontal_white.svg" alt="Atlis Cloud home" width={170} height={40} /></Link>
      <div className="auth-story-content">
        <p className="auth-eyebrow">YOUR CONNECTED WORKSPACE</p>
        <h1>People at the heart.<br /><em>Progress in every step.</em></h1>
        <p>Bring your recruitment, relationships and workforce together. Everything you need to move forward, in one place.</p>
        <div className="auth-benefits">
          {[{Icon:Users,title:'Meaningful connections',text:'Your people and relationships, together.'},{Icon:BriefcaseBusiness,title:'Work that moves forward',text:'From opportunity to ongoing consultant care.'},{Icon:BarChart3,title:'A clearer perspective',text:'Stay close to the details that matter.'}].map(({Icon,title,text})=><div className="auth-benefit" key={title}><span><Icon size={20} strokeWidth={1.6} /></span><div><strong>{title}</strong><p>{text}</p></div></div>)}
        </div>
      </div>
      <div className="auth-story-footer"><ShieldCheck size={17} /><span>A secure space for your team</span><span>© {new Date().getFullYear()} Atlis Cloud</span></div>
      <div className="auth-orbit" aria-hidden="true" />
    </aside>
    <main className="auth-form-area">
      <div className="auth-topbar"><Link href="/" className="auth-mobile-brand"><img src="/brand/atlis-cloud_logo_horizontal_navy.svg" alt="Atlis Cloud home" width={145} height={34} /></Link><Link href="/careers"><BriefcaseBusiness size={16} /> Open roles</Link></div>
      <div className="auth-form-scroll"><div className="auth-form-card"><div className="auth-lock"><ShieldCheck size={25} /></div>{children}</div></div>
      <p className="auth-bottom-note"><ShieldCheck size={14} /> Protected with password and authenticator verification</p>
    </main>
  </div>;
}
