/**
 * csvSafeCell \u2014 Phase 20 OWASP A03 CSV-injection neutraliser (pure).
 *
 * Spreadsheets treat leading `=`, `+`, `-`, `@`, `\\t`, `\\r` as the start
 * of a formula. An attacker who can land such a cell into an exported
 * CSV (e.g. "=CMD()|...") can pop a shell on the reviewer's box.
 *
 * Two helpers:
 *  - `csvSafeCell(v)` \u2014 prefix dangerous strings with a leading `'`
 *    so Excel/Numbers/Google Sheets treat them as text, and CSV-quote
 *    when the value contains `,`, `"`, `\\n`, or `\\r`.
 *  - `csvSafeRow(values)` \u2014 join with commas.
 */
const DANGER_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

export function csvSafeCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s: string;
  if (typeof v === 'string') s = v;
  else if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') s = String(v);
  else s = JSON.stringify(v);

  if (s.length > 0 && DANGER_PREFIXES.includes(s[0])) {
    s = "'" + s;
  }
  if (/[",\r\n]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function csvSafeRow(values: unknown[]): string {
  return values.map(csvSafeCell).join(',');
}
