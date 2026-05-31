export interface DoubleMetaphoneResult {
  primary: string;
  alternate: string;
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);

function isVowel(c: string | undefined): boolean {
  return c !== undefined && VOWELS.has(c);
}

/**
 * Simplified double metaphone — emits primary + alternate phonetic keys.
 * Not a full reference port; handles common English variants enough for
 * fuzzy-match infra (silent leading letters, K/C, G->J before E/I/Y, PH->F,
 * X->KS, Z->S, double-letter collapsing, voicing of -ED endings).
 */
export function doubleMetaphone(input: string): DoubleMetaphoneResult {
  if (typeof input !== 'string') {
    throw new Error('doubleMetaphone: input must be a string');
  }
  const s = input.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return { primary: '', alternate: '' };
  let primary = '';
  let alternate = '';
  let i = 0;
  // Skip silent leading consonant pairs
  if (s.length >= 2 && /^(GN|KN|PN|WR|PS)/.test(s)) i = 1;
  if (s[0] === 'X') {
    primary += 'S';
    alternate += 'S';
    i = 1;
  }
  for (; i < s.length; i += 1) {
    const c = s[i];
    const next = s[i + 1];
    let p = '';
    let a = '';
    switch (c) {
      case 'A': case 'E': case 'I': case 'O': case 'U': case 'Y':
        if (i === 0) { p = 'A'; a = 'A'; }
        break;
      case 'B': p = 'P'; a = 'P'; if (next === 'B') i += 1; break;
      case 'C':
        if (next === 'H') { p = 'X'; a = 'X'; i += 1; }
        else if (next === 'E' || next === 'I' || next === 'Y') { p = 'S'; a = 'S'; }
        else { p = 'K'; a = 'K'; }
        if (next === 'C') i += 1;
        break;
      case 'D':
        if (next === 'G') { p = 'J'; a = 'J'; i += 1; }
        else { p = 'T'; a = 'T'; }
        break;
      case 'F': p = 'F'; a = 'F'; if (next === 'F') i += 1; break;
      case 'G':
        if (next === 'H') { p = ''; a = ''; i += 1; }
        else if (next === 'N') { p = 'N'; a = 'N'; i += 1; }
        else if (next === 'E' || next === 'I' || next === 'Y') { p = 'J'; a = 'K'; }
        else { p = 'K'; a = 'K'; }
        break;
      case 'H':
        if (i === 0 || isVowel(s[i - 1])) { if (isVowel(next)) { p = 'H'; a = 'H'; } }
        break;
      case 'J': p = 'J'; a = 'A'; break;
      case 'K': p = 'K'; a = 'K'; if (next === 'K') i += 1; break;
      case 'L': p = 'L'; a = 'L'; if (next === 'L') i += 1; break;
      case 'M': p = 'M'; a = 'M'; if (next === 'M') i += 1; break;
      case 'N': p = 'N'; a = 'N'; if (next === 'N') i += 1; break;
      case 'P':
        if (next === 'H') { p = 'F'; a = 'F'; i += 1; }
        else { p = 'P'; a = 'P'; if (next === 'P') i += 1; }
        break;
      case 'Q': p = 'K'; a = 'K'; break;
      case 'R': p = 'R'; a = 'R'; if (next === 'R') i += 1; break;
      case 'S':
        if (next === 'H') { p = 'X'; a = 'X'; i += 1; }
        else { p = 'S'; a = 'S'; if (next === 'S') i += 1; }
        break;
      case 'T':
        if (next === 'H') { p = '0'; a = 'T'; i += 1; }
        else { p = 'T'; a = 'T'; if (next === 'T') i += 1; }
        break;
      case 'V': p = 'F'; a = 'F'; break;
      case 'W': if (isVowel(next)) { p = 'W'; a = 'W'; } break;
      case 'X': p = 'KS'; a = 'KS'; break;
      case 'Z': p = 'S'; a = 'S'; if (next === 'Z') i += 1; break;
    }
    // collapse if last char equals new char
    if (p && primary[primary.length - 1] !== p) primary += p;
    if (a && alternate[alternate.length - 1] !== a) alternate += a;
  }
  return { primary, alternate };
}
