import { getSettings } from '@/lib/settings';
export async function GET() {
  const s = await getSettings();
  return Response.json({ brand_name: s.brand_name, brand_tagline: s.brand_tagline, brand_logo_light: s.brand_logo_light, brand_logo_dark: s.brand_logo_dark, brand_icon: s.brand_icon, support_email: s.support_email });
}

export const dynamic = 'force-dynamic';
