export function passwordProblem(p: any): string | null {
  if (typeof p !== 'string' || p.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(p) || !/[a-z]/.test(p) || !/[0-9]/.test(p)) return 'Password needs an upper-case letter, a lower-case letter and a number.';
  return null;
}
