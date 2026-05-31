export interface KalmanFilter1DOptions {
  initialEstimate?: number;
  initialErrorCovariance?: number;
  processNoise?: number;
  measurementNoise?: number;
}

export interface KalmanFilter1DState {
  x: number; // estimate
  p: number; // error covariance
  q: number; // process noise
  r: number; // measurement noise
}

export function kalmanFilter1DInit(opts: KalmanFilter1DOptions = {}): KalmanFilter1DState {
  return {
    x: opts.initialEstimate ?? 0,
    p: opts.initialErrorCovariance ?? 1,
    q: opts.processNoise ?? 1e-5,
    r: opts.measurementNoise ?? 1e-2,
  };
}

export function kalmanFilter1DUpdate(state: KalmanFilter1DState, measurement: number): KalmanFilter1DState {
  if (!Number.isFinite(measurement)) {
    throw new Error('kalmanFilter1DUpdate: non-finite measurement');
  }
  // predict
  const xPred = state.x;
  const pPred = state.p + state.q;
  // update
  const k = pPred / (pPred + state.r);
  const x = xPred + k * (measurement - xPred);
  const p = (1 - k) * pPred;
  return { x, p, q: state.q, r: state.r };
}

export function kalmanFilter1D(measurements: Iterable<number>, opts: KalmanFilter1DOptions = {}): number[] {
  let state = kalmanFilter1DInit(opts);
  const out: number[] = [];
  for (const m of measurements) {
    state = kalmanFilter1DUpdate(state, m);
    out.push(state.x);
  }
  return out;
}
