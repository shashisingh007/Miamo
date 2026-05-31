/**
 * CSV-safe field escaper (OWASP CSV-injection / formula-injection guidance).
 *
 * - Prefixes a leading `=`, `+`, `-`, `@`, TAB, or CR with a single quote (`'`)
 *   so spreadsheet apps treat the cell as a string, not a formula.
 * - Quotes fields that contain quotes, commas, or newlines; embedded quotes
 *   are doubled per RFC 4180.
 * - Coerces non-strings (number/boolean) to strings; null/undefined → empty cell.
 *
 * The output is suitable for direct concatenation into a CSV row.
 */

const DANGEROUS_LEADING = new Set(['=', '+', '-', '@', '\t', '\r']);

export interface CsvEscapeOptions {
  delimiter?: string; // default ','
  /** when true (default), guard cells against spreadsheet formula injection */
  guardFormulaInjection?: boolean;
}

export function escapeCsvField(
  value: unknown,
  opts: CsvEscapeOptions = {}
): string {
  const delim = opts.delimiter ?? ',';
  const guard = opts.guardFormulaInjection ?? true;
  if (value === null || value === undefined) return '';
  let s: string;
  if (typeof value === 'string') s = value;
  else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    s = String(value);
  } else if (value instanceof Date) {
    s = value.toISOString();
  } else {
    s = JSON.stringify(value);
  }
  if (guard && s.length > 0 && DANGEROUS_LEADING.has(s[0])) {
    s = "'" + s;
  }
  const needsQuote =
    s.includes('"') || s.includes(delim) || s.includes('\n') || s.includes('\r');
  if (needsQuote) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function escapeCsvRow(
  cells: ReadonlyArray<unknown>,
  opts: CsvEscapeOptions = {}
): string {
  const delim = opts.delimiter ?? ',';
  return cells.map((c) => escapeCsvField(c, opts)).join(delim);
}

export function buildCsv(
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
  opts: CsvEscapeOptions = {}
): string {
  return rows.map((r) => escapeCsvRow(r, opts)).join('\r\n');
}
