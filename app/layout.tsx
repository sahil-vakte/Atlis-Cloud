import './globals.css';
import type { Metadata, Viewport } from 'next';
import { getSettings } from '@/lib/settings';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: s.brand_name, template: `%s · ${s.brand_name}` },
    description: s.brand_tagline,
    icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon-32x32.png', sizes: '32x32' }], apple: '/apple-touch-icon.png' },
    manifest: '/site.webmanifest',
    openGraph: { images: ['/brand/og.png'], title: s.brand_name, description: s.brand_tagline },
  };
}
export const viewport: Viewport = { themeColor: '#00297B' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-GB"><body>{children}</body></html>;
}
