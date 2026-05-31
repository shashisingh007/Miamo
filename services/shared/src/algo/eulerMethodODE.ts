export interface EulerOptions {
  steps?: number;
}

export interface EulerSample {
  t: number;
  y: number;
}

export function eulerMethodODE(
  f: (t: number, y: number) => number,
  t0: number,
  y0: number,
  tEnd: number,
  opts: EulerOptions = {},
): EulerSample[] {
  const steps = opts.steps ?? 100;
  if (!Number.isInteger(steps) || steps < 1) {
    throw new Error('eulerMethodODE: steps must be a positive integer');
  }
  if (!Number.isFinite(t0) || !Number.isFinite(y0) || !Number.isFinite(tEnd)) {
    throw new Error('eulerMethodODE: t0, y0, tEnd must be finite');
  }
  const h = (tEnd - t0) / steps;
  const out: EulerSample[] = [{ t: t0, y: y0 }];
  let t = t0;
  let y = y0;
  for (let i = 0; i < steps; i += 1) {
    y += h * f(t, y);
    t += h;
    out.push({ t, y });
  }
  return out;
}
