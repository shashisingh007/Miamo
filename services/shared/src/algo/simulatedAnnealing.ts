export interface SimulatedAnnealingOptions<S> {
  initialState: S;
  neighbor: (state: S, rand: () => number) => S;
  energy: (state: S) => number;
  initialTemperature: number;
  coolingRate: number;
  maxIterations: number;
  minTemperature?: number;
  rng?: () => number;
}

export interface SimulatedAnnealingResult<S> {
  bestState: S;
  bestEnergy: number;
  iterations: number;
}

export function simulatedAnnealing<S>(opts: SimulatedAnnealingOptions<S>): SimulatedAnnealingResult<S> {
  if (opts.initialTemperature <= 0) throw new RangeError('initialTemperature must be > 0');
  if (opts.coolingRate <= 0 || opts.coolingRate >= 1) throw new RangeError('coolingRate must be in (0,1)');
  if (!Number.isInteger(opts.maxIterations) || opts.maxIterations < 0) {
    throw new RangeError('maxIterations must be a non-negative integer');
  }
  const rng = opts.rng ?? Math.random;
  const minTemp = opts.minTemperature ?? 1e-9;

  let current = opts.initialState;
  let currentEnergy = opts.energy(current);
  let best = current;
  let bestEnergy = currentEnergy;
  let temp = opts.initialTemperature;
  let iter = 0;

  while (iter < opts.maxIterations && temp > minTemp) {
    const candidate = opts.neighbor(current, rng);
    const candidateEnergy = opts.energy(candidate);
    const delta = candidateEnergy - currentEnergy;
    if (delta <= 0 || rng() < Math.exp(-delta / temp)) {
      current = candidate;
      currentEnergy = candidateEnergy;
      if (currentEnergy < bestEnergy) {
        best = current;
        bestEnergy = currentEnergy;
      }
    }
    temp *= opts.coolingRate;
    iter += 1;
  }

  return { bestState: best, bestEnergy, iterations: iter };
}
