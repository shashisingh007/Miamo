// Delimited tabular parser. Generic over delimiter (`,`, `\t`, `|`, etc.)
// Implements RFC 4180-style quoting: double-quoted fields, "" escape for quotes,
// CRLF / LF / CR newline tolerance, configurable delimiter & quote char.

export interface DelimitedParseOptions {
  delimiter?: string;
  quote?: string;
  trim?: boolean;
  skipEmptyLines?: boolean;
}

export function parseDelimitedTabular(
  input: string,
  opts: DelimitedParseOptions = {}
): string[][] {
  if (typeof input !== 'string') throw new TypeError('input must be a string');
  const delim = opts.delimiter ?? ',';
  const quote = opts.quote ?? '"';
  if (delim.length !== 1) throw new Error('delimiter must be a single character');
  if (quote.length !== 1) throw new Error('quote must be a single character');
  if (delim === quote) throw new Error('delimiter and quote must differ');
  const trim = opts.trim === true;
  const skipEmpty = opts.skipEmptyLines === true;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = input.length;

  const pushField = () => {
    row.push(trim ? field.trim() : field);
    field = '';
  };
  const pushRow = () => {
    if (skipEmpty && row.length === 1 && row[0] === '') {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === quote) {
        if (i + 1 < n && input[i + 1] === quote) {
          field += quote;
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === quote && field === '') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === delim) {
      pushField();
      i++;
      continue;
    }
    if (ch === '\n') {
      pushField();
      pushRow();
      i++;
      continue;
    }
    if (ch === '\r') {
      pushField();
      pushRow();
      if (i + 1 < n && input[i + 1] === '\n') i += 2;
      else i++;
      continue;
    }
    field += ch;
    i++;
  }
  // EOF: flush
  if (inQuotes) throw new Error('unterminated quoted field');
  if (field !== '' || row.length > 0) {
    pushField();
    pushRow();
  }
  return rows;
}

export function parseDelimitedRecords(
  input: string,
  opts: DelimitedParseOptions = {}
): Record<string, string>[] {
  const rows = parseDelimitedTabular(input, opts);
  if (rows.length === 0) return [];
  const header = rows[0];
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const obj: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) obj[header[c]] = r[c] ?? '';
    out.push(obj);
  }
  return out;
}
