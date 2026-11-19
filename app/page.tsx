import Link from 'next/link';
import type { Metadata } from 'next';
import { BriefcaseBusiness, Users, FileText, BarChart3, ShieldCheck, Layers3, Check, Building2 } from 'lucide-react';
import './landing.css';

const title = 'Atlis Cloud | Recruitment, CRM & Workforce Management';
const description = 'Bring recruitment, client relationships, consultant onboarding, timesheets and invoices together with Atlis Cloud. One connected workspace for your workforce.';
export const metadata: Metadata = {
  metadataBase: new URL('https://atlis.cloud'),
  title: { absolute: title }, description, alternates: { canonical: 'https://atlis.cloud/' }, robots: { index: true, follow: true },
  openGraph: { type: 'website', url: 'https://atlis.cloud/', title, description, siteName: 'Atlis Cloud', images: [{ url: '/brand/og.png', alt: 'Atlis Cloud recruitment and workforce platform' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/brand/og.png'] },
};
const features = [
  { icon: BriefcaseBusiness, title: 'Recruitment, from the first brief', text: 'Organise requirements, candidates and submissions. Parse CVs and keep the details your team needs close to the work.' },
  { icon: Building2, title: 'Client relationships with context', text: 'Manage CRM prospects, client contacts and account information in a shared workspace that supports your next conversation.' },
  { icon: Users, title: 'Care beyond the placement', text: 'Coordinate consultant onboarding, documents and PS Care activities throughout the engagement.' },
  { icon: FileText, title: 'The details of delivery', text: 'Keep timesheets, invoices and supplier information connected to your day-to-day workforce operations.' },
  { icon: BarChart3, title: 'A clearer view of your business', text: 'Follow activity through dashboards and reports covering recruitment, requirements and workforce performance.' },
  { icon: ShieldCheck, title: 'Access built around your team', text: 'Use role-based permissions and mandatory authenticator verification to control access to your workspace.' },
];
const faqs = [
  ['What is Atlis Cloud?', 'Atlis Cloud is a shared platform for recruitment, CRM and workforce operations. It brings client and candidate records, consultant care, timesheets, invoices and reporting into one application.'],
  ['Who is the platform for?', 'It supports recruitment, account management, delivery, finance and consultant care teams, with access shaped by each user’s role.'],
  ['How do I access my workspace?', 'Use Sign in with the account provided by your administrator. On your first sign-in, you will be guided through authenticator setup using a QR code.'],
  ['Which authenticator apps can I use?', 'Use a TOTP-compatible app such as Google Authenticator or Microsoft Authenticator. After setup, you need your password and a current six-digit code each time you sign in.'],
  ['Where can candidates find opportunities?', 'Visit the careers page to browse available roles and explore opportunities.'],
];
export default function LandingPage() {
  const structured = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': 'https://atlis.cloud/#organization', name: 'Atlis Cloud', url: 'https://atlis.cloud/', logo: 'https://atlis.cloud/brand/atlis-cloud_icon_fullcolour.svg' },
    { '@type': 'WebSite', name: 'Atlis Cloud', url: 'https://atlis.cloud/', publisher: { '@id': 'https://atlis.cloud/#organization' } },
    { '@type': 'SoftwareApplication', name: 'Atlis Cloud', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: 'https://atlis.cloud/', description },
  ] };
  return <div className="ac-site">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} />
    <a className="ac-skip" href="#main">Skip to content</a>
    <header className="ac-nav ac-wrap"><Link href="/" aria-label="Atlis Cloud home"><img src="/brand/atlis-cloud_logo_horizontal_navy.svg" alt="Atlis Cloud" width="174" height="40" /></Link><nav aria-label="Main navigation"><a href="#features">Features</a><a href="#workflow">How it works</a><a href="#questions">FAQs</a><Link className="ac-button ac-button-small" href="/login">Sign in</Link></nav></header>
    <main id="main">
      <section className="ac-hero ac-wrap">
        <div className="ac-hero-copy"><p className="ac-eyebrow">RECRUITMENT. RELATIONSHIPS. WORKFORCE.</p><h1>Great people.<br />Connected work.<br /><span>One clear view.</span></h1><p className="ac-intro">From the first client conversation to the next consultant milestone. Bring your team, your talent and your operations together in Atlis Cloud.</p><div className="ac-actions"><Link className="ac-button" href="/login">Open your workspace</Link><a className="ac-text-link" href="#features">Explore the platform</a></div><p className="ac-hero-note"><ShieldCheck size={18} aria-hidden="true" /> Protected by authenticator verification</p></div>
        <div className="ac-preview" aria-label="Illustration of the connected Atlis Cloud workflow">
          <div className="ac-preview-top"><img src="/brand/atlis-cloud_icon_fullcolour.svg" alt="" width="32" height="32" /><span>Your connected workspace</span><Layers3 size={20} /></div>
          <div className="ac-preview-body"><div className="ac-preview-label">WORKFORCE OVERVIEW <span>Illustrative workflow</span></div><h2>From opportunity<br />to ongoing success.</h2>
            <div className="ac-stages">{[['Client brief', 'Understand the opportunity'], ['Talent match', 'Find the right people'], ['Onboarding', 'Prepare for a great start'], ['Consultant care', 'Keep every engagement moving']].map(([a,b], i) => <div className="ac-stage" key={a}><span className={i===3 ? 'ac-stage-icon ac-stage-current' : 'ac-stage-icon'}>{i===3 ? <Users size={18} /> : <Check size={18} />}</span><div><strong>{a}</strong><p>{b}</p></div></div>)}</div>
            <div className="ac-preview-foot"><FileText size={20} /><span>Documents, timesheets & invoices</span><Check size={18} /></div>
          </div>
          <div className="ac-floating"><ShieldCheck size={26} /><div><strong>People first. Details covered.</strong><span>One place to keep work moving.</span></div></div>
        </div>
      </section>
      <div className="ac-band"><div className="ac-wrap"><span>One connected workspace for</span><strong>Recruitment</strong><strong>Client relationships</strong><strong>Consultant care</strong><strong>Finance operations</strong></div></div>
      <section id="features" className="ac-section ac-wrap"><div className="ac-section-heading"><p className="ac-eyebrow">THE WHOLE PICTURE</p><h2>Less switching.<br />More moving forward.</h2><p>Give each team the tools it needs, with the shared context that keeps everyone working together.</p></div><div className="ac-features">{features.map(({icon:Icon,title,text}) => <article key={title}><div className="ac-feature-icon"><Icon size={25} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section id="workflow" className="ac-workflow"><div className="ac-wrap ac-workflow-grid"><div><p className="ac-eyebrow">BUILT AROUND THE WAY YOU WORK</p><h2>A placement is a milestone.<br /><span>The relationship continues.</span></h2><p>Connect the work before, during and after an engagement, so important details travel with your people.</p><Link className="ac-button ac-button-light" href="/login">Sign in to Atlis Cloud</Link></div><div className="ac-workflow-list">{[['Build the relationship','Track prospects, contacts and requirements to give each opportunity a clear starting point.'],['Bring the right people together','Move from candidate profiles and CVs to submissions, onboarding and consultant records.'],['Keep the engagement on track','Coordinate care, timesheets, invoices and reporting as the relationship grows.']].map(([h,p])=><article key={h}><h3>{h}</h3><p>{p}</p></article>)}</div></div></section>
      <section className="ac-section ac-wrap ac-access"><div className="ac-access-art"><ShieldCheck size={96} strokeWidth={1.1} aria-hidden="true" /><span>Password + authenticator</span><div aria-hidden="true">● ● ● &nbsp; ● ● ●</div></div><div><p className="ac-eyebrow">A MORE SECURE START</p><h2>Your workspace.<br />An extra layer of protection.</h2><p>Every account starts with authenticator setup. Scan your personal QR code, confirm the code in your app, and you’re ready. Future sign-ins require both your password and a fresh authenticator code.</p><p className="ac-access-note">Role-based permissions help each team member access the work relevant to them.</p></div></section>
      <section id="questions" className="ac-faq-section"><div className="ac-wrap ac-faq-grid"><div><p className="ac-eyebrow">A FEW USEFUL ANSWERS</p><h2>Get to know<br />Atlis Cloud.</h2></div><div>{faqs.map(([q,a])=><details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></div></section>
      <section className="ac-wrap ac-bottom"><div><p className="ac-eyebrow">YOUR NEXT STEP</p><h2>Bring your work together.</h2><p>Your people, relationships and operations. Ready when you are.</p></div><div className="ac-actions"><Link className="ac-button" href="/login">Sign in</Link><Link className="ac-text-link" href="/careers">Explore careers</Link></div></section>
    </main><footer className="ac-footer ac-wrap"><img src="/brand/atlis-cloud_logo_horizontal_navy.svg" alt="Atlis Cloud" width="145" height="34" /><p>© {new Date().getFullYear()} Atlis Cloud</p><nav aria-label="Footer navigation"><Link href="/careers">Careers</Link><Link href="/login">Sign in</Link><a href="#features">Features</a></nav></footer>
  </div>;
}
