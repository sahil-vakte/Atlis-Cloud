import { query } from './db';

export type Settings = Record<string, string> & {
  brand_name: string; brand_tagline: string; brand_logo_light: string; brand_logo_dark: string; brand_icon: string;
};
const DEFAULTS: Settings = {
  brand_name: 'atlis.cloud', brand_tagline: 'Recruitment, workforce and consultant care in one place',
  brand_logo_light: '/brand/atlis-cloud_logo_horizontal_fullcolour.svg', brand_logo_dark: '/brand/atlis-cloud_logo_horizontal_reversed.svg',
  brand_icon: '/brand/atlis-cloud_icon_fullcolour.svg', support_email: 'support@atlis.cloud', date_format: 'dd-MM-yyyy', default_page_size: '25', cv_max_upload_mb: '15',
};
let cache: { at: number; v: Settings } | null = null;
export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < 30_000) return cache.v;
  try {
    const rows = await query<{ setting_key: string; setting_value: string }>('SELECT setting_key, setting_value FROM app_settings');
    const v = { ...DEFAULTS } as Settings;
    for (const r of rows) if (r.setting_value != null) v[r.setting_key] = r.setting_value;
    cache = { at: Date.now(), v };
    return v;
  } catch { return DEFAULTS; }
}
export function clearSettingsCache() { cache = null; }
