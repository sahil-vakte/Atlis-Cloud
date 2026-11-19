import { handler, ok, fail } from '@/lib/api';
import { exec } from '@/lib/db';
import { getSettings, clearSettingsCache } from '@/lib/settings';
import { ADMIN_ROLE } from '@/lib/permissions';

export const GET = handler(async () => ok(await getSettings()));
export const PUT = handler(async (req, _c, user) => {
  if (user.role !== ADMIN_ROLE) return fail(403, 'Only administrators can change settings');
  const body = await req.json();
  for (const [k, v] of Object.entries(body)) {
    if (!/^[a-z0-9_]{2,100}$/.test(k)) continue;
    await exec('INSERT INTO app_settings (setting_key, setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)', [k, v == null ? null : String(v)]);
  }
  clearSettingsCache();
  return ok({ status: 'success', message: 'Settings saved' });
});

export const dynamic = 'force-dynamic';
