export function binaryToGray(n: number): number {
  if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) {
    throw new RangeError('n must be a uint32 integer');
  }
  return (n ^ (n >>> 1)) >>> 0;
}

export function grayToBinary(g: number): number {
  if (!Number.isInteger(g) || g < 0 || g > 0xffffffff) {
    throw new RangeError('g must be a uint32 integer');
  }
  let n = g;
  for (let shift = 1; shift < 32; shift += 1) {
    const v = g >>> shift;
    if (v === 0) break;
    n ^= v;
  }
  return n >>> 0;
}
