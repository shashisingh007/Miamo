import { describe, it, expect } from 'vitest';
import {
  escapeCsvField,
  escapeCsvRow,
  buildCsv,
} from '../csvSafeEscaper';

describe('csvSafeEscaper', () => {
  it('null and undefined → empty cell', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('plain string passes through', () => {
    expect(escapeCsvField('hello')).toBe('hello');
  });

  it('coerces numbers and booleans', () => {
    expect(escapeCsvField(42)).toBe('42');
    expect(escapeCsvField(true)).toBe('true');
    expect(escapeCsvField(false)).toBe('false');
    expect(escapeCsvField(1n)).toBe('1');
  });

  it('Date → ISO string', () => {
    expect(escapeCsvField(new Date('2024-01-02T03:04:05.000Z'))).toBe(
      '2024-01-02T03:04:05.000Z'
    );
  });

  it('object → JSON.stringify then quoted', () => {
    expect(escapeCsvField({ a: 1 })).toBe('"{""a"":1}"');
  });

  it('guards leading = against formula injection', () => {
    expect(escapeCsvField('=1+1')).toBe("'=1+1");
  });

  it('guards leading + - @ and TAB', () => {
    expect(escapeCsvField('+sum')).toBe("'+sum");
    expect(escapeCsvField('-cmd')).toBe("'-cmd");
    expect(escapeCsvField('@SUM')).toBe("'@SUM");
    expect(escapeCsvField('\thello')).toBe("'\thello");
  });

  it('can disable formula guard', () => {
    expect(escapeCsvField('=1+1', { guardFormulaInjection: false })).toBe('=1+1');
  });

  it('quotes fields containing commas', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
  });

  it('escapes embedded double quotes (RFC 4180)', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes fields containing newlines', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvField('line1\r\nline2')).toBe('"line1\r\nline2"');
  });

  it('respects custom delimiter', () => {
    expect(escapeCsvField('a;b', { delimiter: ';' })).toBe('"a;b"');
    // comma alone no longer triggers quoting
    expect(escapeCsvField('a,b', { delimiter: ';' })).toBe('a,b');
  });

  it('escapeCsvRow joins cells with delimiter', () => {
    expect(escapeCsvRow(['a', 'b,c', 42])).toBe('a,"b,c",42');
  });

  it('buildCsv joins rows with CRLF', () => {
    const csv = buildCsv([
      ['col1', 'col2'],
      ['hello', '=cmd'],
    ]);
    expect(csv).toBe("col1,col2\r\nhello,'=cmd");
  });

  it('CR-prefixed cell is guarded', () => {
    expect(escapeCsvField('\rfoo')).toBe('"\'\rfoo"');
  });
});
