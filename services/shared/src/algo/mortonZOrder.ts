function part1by1(n: number): number {
  let x = n & 0xffff;
  x = (x | (x << 8)) & 0x00ff00ff;
  x = (x | (x << 4)) & 0x0f0f0f0f;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;
  return x >>> 0;
}

function compact1by1(n: number): number {
  let x = n & 0x55555555;
  x = (x | (x >>> 1)) & 0x33333333;
  x = (x | (x >>> 2)) & 0x0f0f0f0f;
  x = (x | (x >>> 4)) & 0x00ff00ff;
  x = (x | (x >>> 8)) & 0x0000ffff;
  return x >>> 0;
}

export function mortonEncode2D(x: number, y: number): number {
  if (!Number.isInteger(x) || !Number.isInteger(y)) throw new RangeError('x and y must be integers');
  if (x < 0 || y < 0 || x > 0xffff || y > 0xffff) throw new RangeError('x and y must be in [0, 65535]');
  return ((part1by1(y) << 1) | part1by1(x)) >>> 0;
}

export function mortonDecode2D(code: number): { x: number; y: number } {
  if (!Number.isInteger(code) || code < 0 || code > 0xffffffff) {
    throw new RangeError('code must be a uint32 integer');
  }
  return { x: compact1by1(code), y: compact1by1(code >>> 1) };
}
