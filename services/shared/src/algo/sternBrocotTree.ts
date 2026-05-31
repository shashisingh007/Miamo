export interface SternBrocotFraction {
  numerator: number;
  denominator: number;
}

export function sternBrocotPath(target: SternBrocotFraction): string {
  if (!Number.isInteger(target.numerator) || !Number.isInteger(target.denominator)) {
    throw new RangeError('numerator and denominator must be integers');
  }
  if (target.numerator <= 0 || target.denominator <= 0) {
    throw new RangeError('Stern-Brocot fractions must be positive');
  }
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  if (gcd(target.numerator, target.denominator) !== 1) {
    throw new RangeError('fraction must be reduced (gcd=1)');
  }
  let leftN = 0;
  let leftD = 1;
  let rightN = 1;
  let rightD = 0;
  const path: string[] = [];
  while (true) {
    const midN = leftN + rightN;
    const midD = leftD + rightD;
    const lhs = target.numerator * midD;
    const rhs = midN * target.denominator;
    if (lhs === rhs) return path.join('');
    if (lhs < rhs) {
      path.push('L');
      rightN = midN;
      rightD = midD;
    } else {
      path.push('R');
      leftN = midN;
      leftD = midD;
    }
  }
}

export function sternBrocotMediant(
  a: SternBrocotFraction,
  b: SternBrocotFraction,
): SternBrocotFraction {
  return { numerator: a.numerator + b.numerator, denominator: a.denominator + b.denominator };
}

export function sternBrocotLevel(depth: number): SternBrocotFraction[] {
  if (!Number.isInteger(depth) || depth < 0) {
    throw new RangeError('depth must be a non-negative integer');
  }
  let row: SternBrocotFraction[] = [
    { numerator: 0, denominator: 1 },
    { numerator: 1, denominator: 0 },
  ];
  for (let d = 0; d < depth; d += 1) {
    const next: SternBrocotFraction[] = [row[0]];
    for (let i = 0; i < row.length - 1; i += 1) {
      next.push(sternBrocotMediant(row[i], row[i + 1]));
      next.push(row[i + 1]);
    }
    row = next;
  }
  return row;
}
