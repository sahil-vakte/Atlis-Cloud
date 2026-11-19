import raw from './schema.json';

export type Column = {
  name: string; type: string; nullable: boolean; default: any; length?: number;
  autoIncrement: boolean; enumValues?: string[];
};
export type Table = { name: string; pk: string; columns: Column[]; approxRows: number };

export const schema = raw as unknown as Record<string, Table>;
export const getTable = (name: string): Table => {
  const t = schema[name];
  if (!t) throw new Error(`Unknown table ${name}`);
  return t;
};
export const hasColumn = (t: Table, c: string) => t.columns.some((x) => x.name === c);
export const col = (t: Table, c: string) => t.columns.find((x) => x.name === c);

export const SYSTEM_COLUMNS = new Set(['created_at', 'updated_at', 'deleted_at', 'serverDetailsJson']);
export const isTextType = (c: Column) => ['varchar', 'char', 'text', 'tinytext', 'mediumtext', 'longtext', 'enum'].includes(c.type);
export const isLongText = (c: Column) => ['text', 'mediumtext', 'longtext'].includes(c.type);
export const isNumberType = (c: Column) => ['int', 'bigint', 'smallint', 'decimal', 'float', 'double'].includes(c.type);
export const isBoolType = (c: Column) => c.type === 'tinyint';
export const isDateType = (c: Column) => ['date', 'datetime', 'timestamp'].includes(c.type);

/** Turn camelCase / snake_case column names into readable labels. */
export function humanize(name: string): string {
  const special: Record<string, string> = { pID: 'Profile', rID: 'Requirement', sID: 'Sourcing', cdID: 'Consultant', ir35status: 'IR35 Status', IR35: 'IR35', poc: 'POC' };
  if (special[name]) return special[name];
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\bID\b|\bId\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (s) => s.toUpperCase()) || name;
}
