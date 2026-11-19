import { col, getTable, isDateType } from './schema';

/** Native temporal columns must never be compared to '' or reparsed as legacy text. */
export function reportDate(table: string, column: string) {
  const field = col(getTable(table), column);
  if (!field) throw new Error(`Missing date field: ${table}.${column}`);
  const name = `\`${column}\``;
  if (isDateType(field)) return { value: name, empty: `${name} IS NULL` };
  const text = `TRIM(${name})`;
  // Normalize only recognized formats, then validate the calendar day before parsing.
  const normalized = `(CASE
    WHEN ${text} REGEXP '^[1-9][0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])([ T].*)?$' THEN LEFT(${text},10)
    WHEN ${text} REGEXP '^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[1-9][0-9]{3}$' THEN CONCAT(RIGHT(${text},4),'-',SUBSTRING(${text},4,2),'-',LEFT(${text},2))
    ELSE NULL END)`;
  const value = `(CASE WHEN CAST(RIGHT(${normalized},2) AS UNSIGNED) <= DAY(LAST_DAY(CONCAT(LEFT(${normalized},7),'-01')))
    THEN STR_TO_DATE(${normalized},'%Y-%m-%d') ELSE NULL END)`;
  return { value, empty: `(${name} IS NULL OR ${text}='')` };
}
