import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: ['/', '/careers'], disallow: ['/api/', '/login', '/forgot-password', '/reset-password/', '/dashboard', '/admin/', '/m/', '/legacy/', '/account', '/me', '/settings', '/roles', '/reports', '/masters', '/cv-parser', '/print/', '/consent/', '/register/'] }, sitemap: 'https://atlis.cloud/sitemap.xml' };
}
