export interface Rk4Options {
  steps?: number;
}

export interface Rk4Sample {
  t: number;
  y: number;
}

export function rk4ODE(
  f: (t: number, y: number) => number,
  t0: number,
  y0: number,
  tEnd: number,
  opts: Rk4Options = {},
): Rk4Sample[] {
  const steps = opts.steps ?? 100;
  if (!Number.isInteger(steps) || steps < 1) {
    throw new Error('rk4ODE: steps must be a positive integer');
  }
  if (!Number.isFinite(t0) || !Number.isFinite(y0) || !Number.isFinite(tEnd)) {
    throw new Error('rk4ODE: t0, y0, tEnd must be finite');
  }
  const h = (tEnd - t0) / steps;
  const out: Rk4Sample[] = [{ t: t0, y: y0 }];
  let t = t0;
  let y = y0;
  for (let i = 0; i < steps; i += 1) {
    const k1 = f(t, y);
    const k2 = f(t + h / 2, y + (h * k1) / 2);
    const k3 = f(t + h / 2, y + (h * k2) / 2);
    const k4 = f(t + h, y + h * k3);
    y += (h * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
    t += h;
    out.push({ t, y });
  }
  return out;
}
