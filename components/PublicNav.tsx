import Link from 'next/link';
export default function PublicNav({ careers = false }: { careers?: boolean }) {
  return <header className="public-header"><div className="ac-wrap public-nav">
    <Link href="/" aria-label="Atlis Cloud home"><img src="/brand/atlis-cloud_logo_horizontal_navy.svg" alt="Atlis Cloud" width={170} height={40} /></Link>
    <nav aria-label="Main navigation" className="public-desktop"><Link href="/#features">Platform</Link><Link href="/#workflow">How it works</Link><Link href="/careers" className={careers ? 'current' : ''}>Open roles</Link><Link href="/login" className="public-signin">Sign in</Link></nav>
    <details className="public-mobile"><summary aria-label="Open navigation">Menu <span aria-hidden="true">☰</span></summary><nav aria-label="Mobile navigation"><Link href="/">Home</Link><Link href="/#features">Platform</Link><Link href="/careers">Open roles</Link><Link href="/login">Sign in</Link></nav></details>
  </div></header>;
}
