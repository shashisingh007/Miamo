// Move-to-Front transform: input is a sequence of symbols (numbers in [0, alphabetSize)).
// Encodes each symbol as the index where it appears in the current alphabet permutation,
// then moves that symbol to the front.

export function moveToFrontEncode(input: number[], alphabetSize: number): number[] {
  if (!Number.isInteger(alphabetSize) || alphabetSize <= 0) throw new Error('alphabetSize must be a positive integer');
  const alphabet: number[] = [];
  for (let i = 0; i < alphabetSize; i++) alphabet.push(i);
  const out: number[] = [];
  for (const sym of input) {
    if (!Number.isInteger(sym) || sym < 0 || sym >= alphabetSize) throw new Error('symbol out of range');
    const idx = alphabet.indexOf(sym);
    out.push(idx);
    alphabet.splice(idx, 1);
    alphabet.unshift(sym);
  }
  return out;
}

export function moveToFrontDecode(input: number[], alphabetSize: number): number[] {
  if (!Number.isInteger(alphabetSize) || alphabetSize <= 0) throw new Error('alphabetSize must be a positive integer');
  const alphabet: number[] = [];
  for (let i = 0; i < alphabetSize; i++) alphabet.push(i);
  const out: number[] = [];
  for (const idx of input) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= alphabetSize) throw new Error('index out of range');
    const sym = alphabet[idx];
    out.push(sym);
    alphabet.splice(idx, 1);
    alphabet.unshift(sym);
  }
  return out;
}
