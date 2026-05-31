// Hamming distance for equal-length strings, byte buffers, and bigints.

export function hammingDistanceString(a: string, b: string): number {
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new TypeError('inputs must be strings');
  }
  if (a.length !== b.length) throw new Error('strings must be equal length');
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

export function hammingDistanceBytes(a: Uint8Array, b: Uint8Array): number {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) {
    throw new TypeError('inputs must be Uint8Array');
  }
  if (a.length !== b.length) throw new Error('byte arrays must be equal length');
  let d = 0;
  for (let i = 0; i < a.length; i++) d += popcnt8(a[i] ^ b[i]);
  return d;
}

export function hammingDistanceBigint(a: bigint, b: bigint): number {
  if (typeof a !== 'bigint' || typeof b !== 'bigint') {
    throw new TypeError('inputs must be bigints');
  }
  let x = a ^ b;
  if (x < 0n) throw new RangeError('inputs must be non-negative');
  let d = 0;
  while (x > 0n) {
    if (x & 1n) d++;
    x >>= 1n;
  }
  return d;
}

function popcnt8(x: number): number {
  x = (x & 0x55) + ((x >>> 1) & 0x55);
  x = (x & 0x33) + ((x >>> 2) & 0x33);
  return (x & 0x0f) + ((x >>> 4) & 0x0f);
}
