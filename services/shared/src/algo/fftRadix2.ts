// Cooley-Tukey radix-2 FFT (in-place, iterative). Input length must be a
// power of two. Real and imaginary parts are passed/returned as separate
// number[] arrays.

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

function reverseBits(x: number, log2n: number): number {
  let n = 0;
  for (let i = 0; i < log2n; i += 1) {
    n = (n << 1) | (x & 1);
    x >>>= 1;
  }
  return n;
}

function fftCore(re: number[], im: number[], inverse: boolean): void {
  const n = re.length;
  const log2n = Math.log2(n);
  // bit-reversal permutation
  for (let i = 0; i < n; i += 1) {
    const j = reverseBits(i, log2n);
    if (j > i) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let size = 2; size <= n; size *= 2) {
    const half = size >> 1;
    const angle = (inverse ? 2 : -2) * Math.PI / size;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let start = 0; start < n; start += size) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < half; k += 1) {
        const iEven = start + k;
        const iOdd = start + k + half;
        const tRe = curRe * re[iOdd] - curIm * im[iOdd];
        const tIm = curRe * im[iOdd] + curIm * re[iOdd];
        re[iOdd] = re[iEven] - tRe;
        im[iOdd] = im[iEven] - tIm;
        re[iEven] += tRe;
        im[iEven] += tIm;
        const nextRe = curRe * wRe - curIm * wIm;
        const nextIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
        curIm = nextIm;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i += 1) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

export function fftRadix2(realInput: number[], imagInput?: number[]): { real: number[]; imag: number[] } {
  if (!Array.isArray(realInput)) throw new TypeError('realInput must be an array');
  const n = realInput.length;
  if (!isPowerOfTwo(n)) throw new RangeError('input length must be a power of two and > 0');
  const re = realInput.slice();
  const im = imagInput ? imagInput.slice() : new Array<number>(n).fill(0);
  if (im.length !== n) throw new RangeError('imagInput length must match realInput');
  for (let i = 0; i < n; i += 1) {
    if (!Number.isFinite(re[i]) || !Number.isFinite(im[i])) {
      throw new RangeError('inputs must be finite numbers');
    }
  }
  fftCore(re, im, false);
  return { real: re, imag: im };
}

export function ifftRadix2(realInput: number[], imagInput: number[]): { real: number[]; imag: number[] } {
  if (!Array.isArray(realInput) || !Array.isArray(imagInput)) {
    throw new TypeError('both inputs must be arrays');
  }
  const n = realInput.length;
  if (!isPowerOfTwo(n)) throw new RangeError('input length must be a power of two and > 0');
  if (imagInput.length !== n) throw new RangeError('imagInput length must match realInput');
  const re = realInput.slice();
  const im = imagInput.slice();
  fftCore(re, im, true);
  return { real: re, imag: im };
}
