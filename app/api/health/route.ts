import { one } from '@/lib/db';
export async function GET() {
  try {
    await one('SELECT setting_value FROM app_settings LIMIT 1');
    await one('SELECT id FROM app_email_routes LIMIT 1');
    return Response.json({ status: 'ok' });
  } catch { return Response.json({ status: 'unavailable' }, { status: 503 }); }
}
export const dynamic = 'force-dynamic';
