/** Treat user input as literal text, including SQL LIKE wildcard characters. */
export const searchPattern = (value: string) => `%${value.replace(/[!%_]/g, '!$&')}%`;
export const searchTerms = (value: string) => value.trim().split(/\s+/).filter(Boolean);
export const fullTextPrefix = (term: string) => /^[\p{L}\p{N}]{3,}$/u.test(term) ? `${term}*` : null;
