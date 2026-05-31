export function pascalTriangle(rows: number): bigint[][] {
  if (!Number.isInteger(rows) || rows < 0) {
    throw new RangeError('rows must be a non-negative integer');
  }
  const tri: bigint[][] = [];
  for (let i = 0; i < rows; i += 1) {
    const row: bigint[] = new Array<bigint>(i + 1);
    row[0] = 1n;
    row[i] = 1n;
    for (let j = 1; j < i; j += 1) {
      row[j] = tri[i - 1][j - 1] + tri[i - 1][j];
    }
    tri.push(row);
  }
  return tri;
}

export function binomialCoefficient(n: number, k: number): bigint {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0) {
    throw new RangeError('n and k must be non-negative integers');
  }
  if (k > n) return 0n;
  const kk = k > n - k ? n - k : k;
  let num = 1n;
  let den = 1n;
  for (let i = 1; i <= kk; i += 1) {
    num *= BigInt(n - kk + i);
    den *= BigInt(i);
  }
  return num / den;
}
