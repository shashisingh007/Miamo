// Discrete Cosine Transform (DCT-II) and inverse (DCT-III).
// Orthonormal scaling: out[0] *= 1/sqrt(N), out[k>0] *= sqrt(2/N).

export function dct2(input: number[]): number[] {
  if (!Array.isArray(input)) throw new TypeError('input must be an array');
  const n = input.length;
  if (n === 0) return [];
  for (let i = 0; i < n; i += 1) {
    if (!Number.isFinite(input[i])) throw new RangeError('input values must be finite numbers');
  }
  const out = new Array<number>(n).fill(0);
  for (let k = 0; k < n; k += 1) {
    let sum = 0;
    for (let i = 0; i < n; i += 1) {
      sum += input[i] * Math.cos((Math.PI / n) * (i + 0.5) * k);
    }
    const scale = k === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n);
    out[k] = sum * scale;
  }
  return out;
}

export function idct2(input: number[]): number[] {
  if (!Array.isArray(input)) throw new TypeError('input must be an array');
  const n = input.length;
  if (n === 0) return [];
  for (let i = 0; i < n; i += 1) {
    if (!Number.isFinite(input[i])) throw new RangeError('input values must be finite numbers');
  }
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    let sum = 0;
    for (let k = 0; k < n; k += 1) {
      const scale = k === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n);
      sum += scale * input[k] * Math.cos((Math.PI / n) * (i + 0.5) * k);
    }
    out[i] = sum;
  }
  return out;
}
