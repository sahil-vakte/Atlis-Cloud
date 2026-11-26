import { getTable, humanize, isLongText, type Column } from './schema';
import { formColumnsFor, listColumnsFor } from './crud';
import { canDo } from './permissions';
import { MODULE_MAP, type ModuleDef } from './modules';
import type { SessionUser } from './session';

export type FieldMeta = {
  name: string; label: string; kind: 'text' | 'textarea' | 'richtext' | 'number' | 'date' | 'datetime' | 'bool' | 'select' | 'multiselect' | 'enum' | 'file' | 'email' | 'url' | 'phone';
  lookup?: string; enumValues?: string[]; required: boolean; maxLength?: number;
};

const RICH = /(description|body|jobDescription|html|AR_body|email_template_html|summary)$/i;

export function fieldKind(m: ModuleDef, c: Column): FieldMeta['kind'] {
  if (m.files?.includes(c.name)) return 'file';
  if (m.lookups?.[c.name]) return m.multi?.includes(c.name) ? 'multiselect' : 'select';
  if (c.type === 'enum') return 'enum';
  if (c.type === 'tinyint' && /^(is|has|verify|show|publish|active|relocation|exp|agreed|noDue|gc|terms|status$)/.test(c.name)) return 'bool';
  if (c.type === 'date') return 'date';
  if (c.type === 'datetime' || c.type === 'timestamp') return 'datetime';
  if (['int', 'bigint', 'smallint', 'decimal', 'float', 'double', 'tinyint'].includes(c.type)) return 'number';
  if (/email/i.test(c.name) && !isLongText(c)) return 'email';
  if (/(website|url|linkedin)/i.test(c.name) && !isLongText(c)) return 'url';
  if (/(contact(no)?|phone|mobile)$/i.test(c.name) && !/name/i.test(c.name)) return 'phone';
  if (isLongText(c)) return RICH.test(c.name) ? 'richtext' : 'textarea';
  return 'text';
}

export async function moduleMeta(m: ModuleDef, user: SessionUser) {
  const t = getTable(m.table);
  const fields: FieldMeta[] = formColumnsFor(m).map((c) => ({
    name: c.name, label: humanize(c.name), kind: fieldKind(m, c), lookup: m.lookups?.[c.name], enumValues: c.enumValues,
    required: c.name === m.titleField && (m.key === 'profiles' || (!c.nullable && c.default == null && !c.autoIncrement)), maxLength: c.length,
  }));
  const names = new Set(fields.map((f) => f.name));
  let sections = (m.formSections || []).map((s) => ({ title: s.title, fields: s.fields.filter((f) => names.has(f)) })).filter((s) => s.fields.length);
  const used = new Set(sections.flatMap((s) => s.fields));
  const rest = fields.map((f) => f.name).filter((f) => !used.has(f));
  if (rest.length) sections.push({ title: sections.length ? 'Other details' : 'Details', fields: rest });
  const listCols = listColumnsFor(m);
  const columnKinds = Object.fromEntries(t.columns.map((c) => [c.name, fieldKind(m, c)]));
  return {
    key: m.key, label: m.label, singular: m.singular, group: m.group, pk: t.pk, titleField: m.titleField,
    listColumns: listCols.map((c) => ({ name: c, label: humanize(c), kind: columnKinds[c] })),
    filters: [
      ...(m.filters || []).filter((f) => t.columns.some((c) => c.name === f)).map((f) => ({ name: f, label: humanize(f), lookup: m.lookups?.[f], multi: m.key === 'profiles' && f === 'skillset' })),
      ...(m.key === 'profiles' ? [{ name: 'designationKeyword', label: 'Designation keywords (incl. CV)' }] : []),
    ],
    hasCreatedAt: t.columns.some((c) => c.name === 'created_at'),
    fields, sections, softDelete: !!m.softDelete,
    related: (m.related || []).filter((r) => MODULE_MAP[r.module]).map((r) => ({ ...r, label: r.label || MODULE_MAP[r.module].label })),
    can: {
      add: await canDo(user, m, 'add'), edit: await canDo(user, m, 'edit'), delete: await canDo(user, m, 'delete'),
      restore: m.softDelete ? await canDo(user, m, 'restore') : false, export: await canDo(user, m, 'export'),
    },
    defaults: m.defaults || {},
  };
}
