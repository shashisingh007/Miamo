// Simplified Metaphone implementation (single-encoding variant) based on
// Lawrence Philips' original 1990 algorithm. Suitable for English-like
// phonetic similarity comparison.

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function isVowel(ch: string | undefined): boolean {
  return ch !== undefined && VOWELS.has(ch);
}

export function metaphoneEncode(input: string): string {
  if (typeof input !== 'string') throw new TypeError('input must be a string');
  const w = input.toUpperCase().replace(/[^A-Z]/g, '');
  if (w.length === 0) return '';

  // Drop initial silent letters
  let i = 0;
  if (w.length >= 2) {
    const pre2 = w.slice(0, 2);
    if (pre2 === 'KN' || pre2 === 'GN' || pre2 === 'PN' || pre2 === 'AE' || pre2 === 'WR') {
      i = 1;
    } else if (pre2 === 'WH') {
      // WH -> W
      i = 1;
    }
  }
  if (w[0] === 'X') {
    // X at start -> S
    return 'S' + metaphoneTail(w.slice(1));
  }

  let head = '';
  // First letter: vowels preserved at start
  if (isVowel(w[i])) {
    head = w[i];
    i += 1;
  }
  return head + metaphoneTail(w.slice(i));
}

function metaphoneTail(s: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const prev = i > 0 ? s[i - 1] : '';
    const next = i + 1 < s.length ? s[i + 1] : '';
    const next2 = i + 2 < s.length ? s[i + 2] : '';

    // Skip duplicated consonants (except C)
    if (c === prev && c !== 'C') { i += 1; continue; }

    switch (c) {
      case 'A': case 'E': case 'I': case 'O': case 'U':
        // Vowels mid/end are dropped
        break;
      case 'B':
        // B silent at end after M
        if (!(i === s.length - 1 && prev === 'M')) out.push('B');
        break;
      case 'C':
        if (next === 'I' && next2 === 'A') out.push('X');
        else if (next === 'H') { out.push('X'); i += 1; }
        else if (next === 'I' || next === 'E' || next === 'Y') out.push('S');
        else out.push('K');
        break;
      case 'D':
        if (next === 'G' && (next2 === 'E' || next2 === 'I' || next2 === 'Y')) {
          out.push('J'); i += 2;
        } else out.push('T');
        break;
      case 'F': out.push('F'); break;
      case 'G':
        if (next === 'H') {
          if (i + 2 >= s.length || !isVowel(next2)) {
            // silent
            i += 1;
          } else {
            out.push('F'); i += 1;
          }
        } else if (next === 'N') {
          // silent
        } else if (next === 'E' || next === 'I' || next === 'Y') {
          out.push('J');
        } else out.push('K');
        break;
      case 'H':
        if (isVowel(prev) && !isVowel(next)) { /* silent */ }
        else out.push('H');
        break;
      case 'J': out.push('J'); break;
      case 'K':
        if (prev !== 'C') out.push('K');
        break;
      case 'L': out.push('L'); break;
      case 'M': out.push('M'); break;
      case 'N': out.push('N'); break;
      case 'P':
        if (next === 'H') { out.push('F'); i += 1; }
        else out.push('P');
        break;
      case 'Q': out.push('K'); break;
      case 'R': out.push('R'); break;
      case 'S':
        if (next === 'H') { out.push('X'); i += 1; }
        else if (next === 'I' && (next2 === 'O' || next2 === 'A')) out.push('X');
        else out.push('S');
        break;
      case 'T':
        if (next === 'H') { out.push('0'); i += 1; }
        else if (next === 'I' && (next2 === 'O' || next2 === 'A')) out.push('X');
        else out.push('T');
        break;
      case 'V': out.push('F'); break;
      case 'W':
        if (isVowel(next)) out.push('W');
        break;
      case 'X':
        out.push('K'); out.push('S');
        break;
      case 'Y':
        if (isVowel(next)) out.push('Y');
        break;
      case 'Z': out.push('S'); break;
      default: break;
    }
    i += 1;
  }
  return out.join('');
}
