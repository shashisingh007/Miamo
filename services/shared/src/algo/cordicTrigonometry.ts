// CORDIC (COordinate Rotation DIgital Computer) for sin/cos/atan2 in
// rotation/vectoring modes. Iterative, uses only shifts and adds in classic
// hardware; here we implement faithfully in JS doubles.

const ITERS = 40;
const ANGLES: number[] = [];
let K = 1;
for (let i = 0; i < ITERS; i += 1) {
  ANGLES.push(Math.atan(2 ** -i));
  K = K * (1 / Math.sqrt(1 + 2 ** (-2 * i)));
}
const KN = K;

function reduceAngle(theta: number): { sign: 1 | -1; flipPi: boolean; t: number } {
  // Reduce to [-pi/2, pi/2]; track sign & whether to flip via pi.
  let t = theta;
  let flipPi = false;
  // Bring into [-pi, pi]
  const TWO_PI = 2 * Math.PI;
  t = t - TWO_PI * Math.floor((t + Math.PI) / TWO_PI);
  let sign: 1 | -1 = 1;
  if (t > Math.PI / 2) {
    t = t - Math.PI;
    flipPi = true;
  } else if (t < -Math.PI / 2) {
    t = t + Math.PI;
    flipPi = true;
  }
  return { sign, flipPi, t };
}

export function cordicSinCos(theta: number): { sin: number; cos: number } {
  if (typeof theta !== 'number' || !Number.isFinite(theta)) {
    throw new Error('cordicSinCos: theta must be finite number');
  }
  const { flipPi, t } = reduceAngle(theta);
  let x = KN;
  let y = 0;
  let z = t;
  for (let i = 0; i < ITERS; i += 1) {
    const d = z >= 0 ? 1 : -1;
    const xn = x - d * y * 2 ** -i;
    const yn = y + d * x * 2 ** -i;
    const zn = z - d * ANGLES[i];
    x = xn;
    y = yn;
    z = zn;
  }
  return flipPi ? { sin: -y, cos: -x } : { sin: y, cos: x };
}

export function cordicAtan2(y: number, x: number): number {
  if (typeof y !== 'number' || typeof x !== 'number') {
    throw new Error('cordicAtan2: inputs must be numbers');
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error('cordicAtan2: inputs must be finite');
  }
  if (x === 0 && y === 0) return 0;
  // Map to right half-plane for vectoring CORDIC convergence.
  let xx = x;
  let yy = y;
  let offset = 0;
  if (xx < 0) {
    if (yy >= 0) {
      // rotate by -pi/2: x'=y, y'=-x; remember offset = +pi/2
      const tx = yy;
      yy = -xx;
      xx = tx;
      offset = Math.PI / 2;
    } else {
      // rotate by +pi/2: x'=-y, y'=x; offset = -pi/2
      const tx = -yy;
      yy = xx;
      xx = tx;
      offset = -Math.PI / 2;
    }
  }
  let z = 0;
  for (let i = 0; i < ITERS; i += 1) {
    const d = yy >= 0 ? -1 : 1;
    const xn = xx - d * yy * 2 ** -i;
    const yn = yy + d * xx * 2 ** -i;
    z -= d * ANGLES[i];
    xx = xn;
    yy = yn;
  }
  return z + offset;
}

export function cordicTrigonometry() {
  return { cordicSinCos, cordicAtan2 };
}
