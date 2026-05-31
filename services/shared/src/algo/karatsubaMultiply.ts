// Karatsuba multiplication on non-negative integers (as decimal strings).
// O(n^log2(3)). Falls back to native BigInt below a threshold for cutoff;
// only big-number code paths are exercised at scale.

const THRESHOLD = 32; // digit count under which we use BigInt directly

function trimLeadingZeros(s: string): string {
  let i = 0;
  while (i < s.length - 1 && s[i] === '0') i += 1;
  return s.slice(i);
}

function addStrings(a: string, b: string): string {
  let i = a.length - 1;
  let j = b.length - 1;
  let carry = 0;
  let out = '';
  while (i >= 0 || j >= 0 || carry) {
    const da = i >= 0 ? a.charCodeAt(i) - 48 : 0;
    const db = j >= 0 ? b.charCodeAt(j) - 48 : 0;
    const sum = da + db + carry;
    out = String(sum % 10) + out;
    carry = (sum / 10) | 0;
    i -= 1;
    j -= 1;
  }
  return trimLeadingZeros(out);
}

function subStrings(a: string, b: string): string {
  // assumes a >= b, both non-negative decimals
  let i = a.length - 1;
  let j = b.length - 1;
  let borrow = 0;
  let out = '';
  while (i >= 0) {
    let da = a.charCodeAt(i) - 48 - borrow;
    const db = j >= 0 ? b.charCodeAt(j) - 48 : 0;
    if (da < db) {
      da += 10;
      borrow = 1;
    } else {
      borrow = 0;
    }
    out = String(da - db) + out;
    i -= 1;
    j -= 1;
  }
  return trimLeadingZeros(out);
}

function shiftLeft(s: string, k: number): string {
  if (s === '0') return '0';
  return s + '0'.repeat(k);
}

export function karatsubaMultiply(a: string, b: string): string {
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new TypeError('inputs must be decimal strings');
  }
  if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) {
    throw new RangeError('inputs must contain only digits 0-9');
  }
  const x = trimLeadingZeros(a);
  const y = trimLeadingZeros(b);
  if (x === '0' || y === '0') return '0';
  if (x.length < THRESHOLD || y.length < THRESHOLD) {
    return (BigInt(x) * BigInt(y)).toString();
  }
  const n = Math.max(x.length, y.length);
  const m = n >> 1;
  const xs = x.padStart(n, '0');
  const ys = y.padStart(n, '0');
  const splitHi = n - m;
  const xH = trimLeadingZeros(xs.slice(0, splitHi));
  const xL = trimLeadingZeros(xs.slice(splitHi));
  const yH = trimLeadingZeros(ys.slice(0, splitHi));
  const yL = trimLeadingZeros(ys.slice(splitHi));
  const p1 = karatsubaMultiply(xH, yH);
  const p2 = karatsubaMultiply(xL, yL);
  const sumX = addStrings(xH, xL);
  const sumY = addStrings(yH, yL);
  const p3 = karatsubaMultiply(sumX, sumY);
  // mid = p3 - p1 - p2
  const mid = subStrings(subStrings(p3, p1), p2);
  // result = p1 * 10^(2m) + mid * 10^m + p2
  const part1 = shiftLeft(p1, 2 * m);
  const part2 = shiftLeft(mid, m);
  return trimLeadingZeros(addStrings(addStrings(part1, part2), p2));
}
