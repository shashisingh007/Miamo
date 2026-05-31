export interface Complex {
  re: number;
  im: number;
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

function reverseBits(x: number, bits: number): number {
  let r = 0;
  for (let i = 0; i < bits; i++) {
    r = (r << 1) | (x & 1);
    x >>>= 1;
  }
  return r >>> 0;
}

export function fastFourierTransform(input: Complex[]): Complex[] {
  const n = input.length;
  if (n === 0) return [];
  if (!isPowerOfTwo(n)) throw new RangeError('input length must be a power of 2');
  const bits = Math.log2(n);
  const out: Complex[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const j = reverseBits(i, bits);
    out[j] = { re: input[i].re, im: input[i].im };
  }
  for (let size = 2; size <= n; size *= 2) {
    const half = size >> 1;
    const theta = (-2 * Math.PI) / size;
    const wRe = Math.cos(theta);
    const wIm = Math.sin(theta);
    for (let start = 0; start < n; start += size) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < half; k++) {
        const a = out[start + k];
        const b = out[start + k + half];
        const tRe = curRe * b.re - curIm * b.im;
        const tIm = curRe * b.im + curIm * b.re;
        out[start + k] = { re: a.re + tRe, im: a.im + tIm };
        out[start + k + half] = { re: a.re - tRe, im: a.im - tIm };
        const nextRe = curRe * wRe - curIm * wIm;
        const nextIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
        curIm = nextIm;
      }
    }
  }
  return out;
}

export function inverseFastFourierTransform(input: Complex[]): Complex[] {
  const n = input.length;
  if (n === 0) return [];
  const conj = input.map((c) => ({ re: c.re, im: -c.im }));
  const transformed = fastFourierTransform(conj);
  return transformed.map((c) => ({ re: c.re / n, im: -c.im / n }));
}
