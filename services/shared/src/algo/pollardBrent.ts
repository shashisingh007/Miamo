function mulmod(a: bigint, b: bigint, n: bigint): bigint {
  return (a * b) % n;
}

function gcdBig(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

export function pollardBrent(n: bigint, seed = 1n): bigint {
  if (n <= 1n) throw new Error('pollardBrent: n > 1 required');
  if (n % 2n === 0n) return 2n;
  if (n === 4n) return 2n;
  let y = seed % n;
  if (y < 2n) y = 2n;
  let c = 1n;
  let m = 128n;
  let g = 1n;
  let r = 1n;
  let q = 1n;
  let x = y;
  let ys = y;
  let attempts = 0;
  while (g === 1n) {
    if (++attempts > 200) {
      c++;
      y = 2n;
      r = 1n;
      q = 1n;
      attempts = 0;
      if (c > 50n) throw new Error('pollardBrent: failed to find factor');
      continue;
    }
    x = y;
    for (let i = 0n; i < r; i++) y = (mulmod(y, y, n) + c) % n;
    let k = 0n;
    while (k < r && g === 1n) {
      ys = y;
      const lim = m < r - k ? m : r - k;
      for (let i = 0n; i < lim; i++) {
        y = (mulmod(y, y, n) + c) % n;
        const diff = x > y ? x - y : y - x;
        q = mulmod(q, diff, n);
      }
      g = gcdBig(q, n);
      k += m;
    }
    r *= 2n;
  }
  if (g === n) {
    do {
      ys = (mulmod(ys, ys, n) + c) % n;
      const diff = x > ys ? x - ys : ys - x;
      g = gcdBig(diff, n);
    } while (g === 1n);
  }
  if (g === n) throw new Error('pollardBrent: failed to find factor');
  return g;
}
