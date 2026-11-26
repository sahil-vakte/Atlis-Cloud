/** Treat user input as literal text, including SQL LIKE wildcard characters. */
export const searchPattern = (value: string) => `%${value.replace(/[!%_]/g, '!$&')}%`;
export const searchTerms = (value: string) => value.trim().split(/\s+/).filter(Boolean);
export const fullTextPrefix = (term: string) => /^[\p{L}\p{N}]{3,}$/u.test(term) ? `${term}*` : null;

/** Convert explicit AND/OR/NOT search into SQL using parameterized term predicates. */
export function booleanExpression(value: string, termPredicate: (term: string) => string): string {
  const invalid = () => Object.assign(new Error('Use AND, OR, NOT, parentheses, or quoted phrases. Check for missing terms or quotes.'), { status: 400 });
  if (value.length > 512) throw Object.assign(new Error('Boolean search is limited to 512 characters.'), { status: 400 });
  const tokens = value.match(/"[^"]*"|[()]|[^"\s()]+|"/g) ?? [];
  let position = 0;
  const peek = () => tokens[position]?.toUpperCase();
  const atom = (): string => {
    const token = tokens[position++];
    if (token === '(') {
      const group = or();
      if (tokens[position++] !== ')') throw invalid();
      return '(' + group + ')';
    }
    if (!token || /^(?:AND|OR|NOT|\)|")$/i.test(token)) throw invalid();
    const term = token.startsWith('"') ? token.slice(1, -1).trim() : token;
    if (!term) throw invalid();
    return termPredicate(term);
  };
  const unary = (): string => {
    if (peek() !== 'NOT') return atom();
    position++;
    return '(NOT ' + unary() + ')';
  };
  const and = (): string => {
    let expression = unary();
    while (peek() === 'AND' || (peek() && peek() !== 'OR' && peek() !== ')')) {
      if (peek() === 'AND') position++;
      expression += ' AND ' + unary();
    }
    return expression;
  };
  const or = (): string => {
    const expressions = [and()];
    while (peek() === 'OR') {
      position++;
      expressions.push(and());
    }
    return '(' + expressions.join(' OR ') + ')';
  };
  const expression = or();
  if (position !== tokens.length) throw invalid();
  return expression;
}
