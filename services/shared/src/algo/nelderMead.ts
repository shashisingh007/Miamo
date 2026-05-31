export interface NelderMeadOptions {
  maxIter?: number;
  tol?: number;
  step?: number;
  alpha?: number;
  gamma?: number;
  rho?: number;
  sigma?: number;
}

export interface NelderMeadResult {
  x: number[];
  fx: number;
  iters: number;
  converged: boolean;
}

export function nelderMead(
  f: (x: number[]) => number,
  x0: number[],
  opts: NelderMeadOptions = {},
): NelderMeadResult {
  const n = x0.length;
  if (n === 0) throw new Error('nelderMead: empty x0');
  const maxIter = opts.maxIter ?? 1000;
  const tol = opts.tol ?? 1e-8;
  const step = opts.step ?? 0.05;
  const alpha = opts.alpha ?? 1;
  const gamma = opts.gamma ?? 2;
  const rho = opts.rho ?? 0.5;
  const sigma = opts.sigma ?? 0.5;
  if (!(maxIter >= 1)) throw new Error('nelderMead: maxIter>=1');
  if (!(tol > 0)) throw new Error('nelderMead: tol>0');
  if (!(step !== 0)) throw new Error('nelderMead: step != 0');
  const sx: number[][] = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const v = x0.slice();
    const s = v[i] === 0 ? step : v[i] * (1 + step);
    v[i] = s;
    sx.push(v);
  }
  const fv = sx.map((p) => {
    const r = f(p);
    if (!Number.isFinite(r)) throw new Error('nelderMead: f returned non-finite');
    return r;
  });
  let it = 0;
  let converged = false;
  for (it = 0; it < maxIter; it++) {
    const order = sx.map((_, i) => i).sort((a, b) => fv[a] - fv[b]);
    const newSx = order.map((i) => sx[i]);
    const newFv = order.map((i) => fv[i]);
    for (let i = 0; i < n + 1; i++) {
      sx[i] = newSx[i];
      fv[i] = newFv[i];
    }
    const fbest = fv[0];
    const fworst = fv[n];
    let spread = 0;
    for (let i = 1; i <= n; i++) spread = Math.max(spread, Math.abs(fv[i] - fbest));
    if (spread < tol) {
      converged = true;
      break;
    }
    const xc = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += sx[j][i];
      xc[i] = s / n;
    }
    const xr = xc.map((v, i) => v + alpha * (v - sx[n][i]));
    const fr = f(xr);
    if (!Number.isFinite(fr)) throw new Error('nelderMead: f non-finite');
    if (fbest <= fr && fr < fv[n - 1]) {
      sx[n] = xr;
      fv[n] = fr;
      continue;
    }
    if (fr < fbest) {
      const xe = xc.map((v, i) => v + gamma * (xr[i] - v));
      const fe = f(xe);
      if (fe < fr) {
        sx[n] = xe;
        fv[n] = fe;
      } else {
        sx[n] = xr;
        fv[n] = fr;
      }
      continue;
    }
    const xCon = xc.map((v, i) => v + rho * (sx[n][i] - v));
    const fCon = f(xCon);
    if (fCon < fworst) {
      sx[n] = xCon;
      fv[n] = fCon;
      continue;
    }
    for (let i = 1; i <= n; i++) {
      sx[i] = sx[0].map((v, j) => v + sigma * (sx[i][j] - v));
      fv[i] = f(sx[i]);
    }
  }
  return { x: sx[0].slice(), fx: fv[0], iters: it, converged };
}
