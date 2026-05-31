export function lzwEncode(input: string): number[] {
  if (input.length === 0) return [];
  const dict = new Map<string, number>();
  for (let i = 0; i < 256; i++) dict.set(String.fromCharCode(i), i);
  let next = 256;
  let w = '';
  const out: number[] = [];
  for (const c of input) {
    const wc = w + c;
    if (dict.has(wc)) {
      w = wc;
    } else {
      out.push(dict.get(w)!);
      dict.set(wc, next++);
      w = c;
    }
  }
  if (w.length > 0) out.push(dict.get(w)!);
  return out;
}

export function lzwDecode(codes: number[]): string {
  if (codes.length === 0) return '';
  const dict: string[] = [];
  for (let i = 0; i < 256; i++) dict.push(String.fromCharCode(i));
  let prev = dict[codes[0]];
  if (prev === undefined) throw new RangeError('invalid initial code');
  let out = prev;
  for (let i = 1; i < codes.length; i++) {
    const k = codes[i];
    let entry: string;
    if (k < dict.length) entry = dict[k];
    else if (k === dict.length) entry = prev + prev[0];
    else throw new RangeError(`invalid LZW code ${k}`);
    out += entry;
    dict.push(prev + entry[0]);
    prev = entry;
  }
  return out;
}
