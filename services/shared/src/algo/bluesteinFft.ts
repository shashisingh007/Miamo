function isPow2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export interface ComplexArr {
  re: number[];
  im: number[];
}

function fftPow2(re: number[], im: number[], inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI) / len * (inverse ? 1 : -1);
    const wlr = Math.cos(ang);
    const wli = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wr = 1;
      let wi = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + half] * wr - im[i + k + half] * wi;
        const vi = re[i + k + half] * wi + im[i + k + half] * wr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + half] = ur - vr;
        im[i + k + half] = ui - vi;
        const nwr = wr * wlr - wi * wli;
        const nwi = wr * wli + wi * wlr;
        wr = nwr;
        wi = nwi;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] /= n;
  }
}

export function bluesteinFft(input: ComplexArr, inverse = false): ComplexArr {
  const n = input.re.length;
  if (n === 0) throw new Error('bluestein: empty');
  if (input.im.length !== n) throw new Error('bluestein: re/im length mismatch');
  let m = 1;
  while (m < 2 * n) m <<= 1;
  const sign = inverse ? 1 : -1;
  const wRe: number[] = new Array(n);
  const wIm: number[] = new Array(n);
  for (let k = 0; k < n; k++) {
    const ang = (sign * Math.PI * k * k) / n;
    wRe[k] = Math.cos(ang);
    wIm[k] = Math.sin(ang);
  }
  const aRe = new Array(m).fill(0);
  const aIm = new Array(m).fill(0);
  const bRe = new Array(m).fill(0);
  const bIm = new Array(m).fill(0);
  for (let k = 0; k < n; k++) {
    const xr = input.re[k];
    const xi = input.im[k];
    aRe[k] = xr * wRe[k] - xi * wIm[k];
    aIm[k] = xr * wIm[k] + xi * wRe[k];
  }
  bRe[0] = wRe[0];
  bIm[0] = -wIm[0];
  for (let k = 1; k < n; k++) {
    const c = wRe[k];
    const s = -wIm[k];
    bRe[k] = c;
    bIm[k] = s;
    bRe[m - k] = c;
    bIm[m - k] = s;
  }
  if (!isPow2(m)) throw new Error('bluestein: internal m not pow2');
  fftPow2(aRe, aIm, false);
  fftPow2(bRe, bIm, false);
  for (let i = 0; i < m; i++) {
    const tr = aRe[i] * bRe[i] - aIm[i] * bIm[i];
    const ti = aRe[i] * bIm[i] + aIm[i] * bRe[i];
    aRe[i] = tr;
    aIm[i] = ti;
  }
  fftPow2(aRe, aIm, true);
  const re = new Array(n);
  const im = new Array(n);
  for (let k = 0; k < n; k++) {
    const cr = wRe[k];
    const ci = wIm[k];
    let r = aRe[k] * cr - aIm[k] * ci;
    let im0 = aRe[k] * ci + aIm[k] * cr;
    if (inverse) {
      r /= n;
      im0 /= n;
    }
    re[k] = r;
    im[k] = im0;
  }
  return { re, im };
}
