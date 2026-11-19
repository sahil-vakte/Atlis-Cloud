export type EmailRoute = { original_email: string; replacement_email: string; enabled: number | boolean };
export const legacyEmail = (email: string) => /@[^@]*(testq|decillion|virgule|vurgule)[^@]*$/i.test(email);
export function emailList(value: string): string[] {
  if (!value?.trim()) return [];
  if (/[\r\n]/.test(value)) throw new Error('Email addresses cannot contain line breaks.');
  const values = value.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean);
  if (values.length > 100 || values.some(s => s.length > 254 || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(s))) throw new Error('Enter valid email addresses separated by commas.');
  return [...new Set(values)];
}
/** Legacy addresses are never delivered to directly, even if no migration row exists. */
export function routeRecipients(value: string | undefined, routes: EmailRoute[]) {
  const result: string[] = [];
  for (const email of emailList(value || '')) {
    const route = routes.find(r => r.original_email.toLowerCase() === email);
    if (route) {
      if (!route.enabled) continue;
      const replacements = emailList(route.replacement_email);
      if (replacements.some(legacyEmail)) throw new Error('Replace legacy recipients with your own email addresses.');
      result.push(...replacements);
    } else if (!legacyEmail(email)) result.push(email);
  }
  return [...new Set(result)].join(',');
}
