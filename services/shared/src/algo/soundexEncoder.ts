const CODE: Record<string, string> = {
  B: '1', F: '1', P: '1', V: '1',
  C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
  D: '3', T: '3',
  L: '4',
  M: '5', N: '5',
  R: '6',
};

export function soundexEncode(input: string): string {
  if (typeof input !== 'string') throw new TypeError('input must be a string');
  const letters = input.toUpperCase().replace(/[^A-Z]/g, '');
  if (letters.length === 0) return '0000';
  const first = letters[0];
  const codes: string[] = [];
  let prev = CODE[first] ?? '';
  for (let i = 1; i < letters.length; i++) {
    const ch = letters[i];
    if (ch === 'H' || ch === 'W') continue;
    const c = CODE[ch] ?? '';
    if (c !== '' && c !== prev) codes.push(c);
    if (c !== '') prev = c;
    else prev = '';
  }
  const result = (first + codes.join('') + '000').slice(0, 4);
  return result;
}
