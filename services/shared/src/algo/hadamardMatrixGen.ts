// Generate a Hadamard matrix of order n=2^k via Sylvester construction.
// H_1 = [[1]], H_{2n} = [[H, H], [H, -H]]. Returns n x n matrix of +/-1.

export function hadamardMatrixGen(n: number): number[][] {
  if (!Number.isInteger(n) || n <= 0) throw new Error('hadamardMatrixGen: n must be a positive integer');
  // n must be a power of 2
  if ((n & (n - 1)) !== 0) throw new Error('hadamardMatrixGen: n must be a power of 2');
  let H: number[][] = [[1]];
  while (H.length < n) {
    const m = H.length;
    const H2: number[][] = [];
    for (let i = 0; i < 2 * m; i++) H2.push(new Array(2 * m));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        const v = H[i][j];
        H2[i][j] = v;
        H2[i][j + m] = v;
        H2[i + m][j] = v;
        H2[i + m][j + m] = -v;
      }
    }
    H = H2;
  }
  return H;
}
