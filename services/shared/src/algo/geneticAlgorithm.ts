export interface GeneticAlgorithmOptions<G> {
  initialPopulation: G[];
  fitness: (genome: G) => number;
  crossover: (a: G, b: G, rng: () => number) => G;
  mutate: (g: G, rng: () => number) => G;
  mutationRate: number;
  eliteCount: number;
  generations: number;
  rng?: () => number;
}

export interface GeneticAlgorithmResult<G> {
  best: G;
  bestFitness: number;
  generation: number;
}

export function geneticAlgorithm<G>(opts: GeneticAlgorithmOptions<G>): GeneticAlgorithmResult<G> {
  if (opts.initialPopulation.length === 0) throw new RangeError('initialPopulation must be non-empty');
  if (opts.eliteCount < 0 || opts.eliteCount > opts.initialPopulation.length) {
    throw new RangeError('eliteCount out of range');
  }
  if (opts.mutationRate < 0 || opts.mutationRate > 1) throw new RangeError('mutationRate out of range');
  if (opts.generations < 0) throw new RangeError('generations must be >= 0');
  const rng = opts.rng ?? Math.random;
  const size = opts.initialPopulation.length;

  let population = opts.initialPopulation.slice();
  let scored = population.map((g) => ({ g, f: opts.fitness(g) }));
  scored.sort((a, b) => b.f - a.f);
  let best = scored[0].g;
  let bestF = scored[0].f;

  function pickIndex(): number {
    const total = scored.reduce((s, x) => s + Math.max(0, x.f), 0);
    if (total === 0) return Math.floor(rng() * size);
    let t = rng() * total;
    for (let i = 0; i < scored.length; i++) {
      t -= Math.max(0, scored[i].f);
      if (t <= 0) return i;
    }
    return scored.length - 1;
  }

  let gen = 0;
  for (; gen < opts.generations; gen++) {
    const next: G[] = [];
    for (let i = 0; i < opts.eliteCount; i++) next.push(scored[i].g);
    while (next.length < size) {
      const a = scored[pickIndex()].g;
      const b = scored[pickIndex()].g;
      let child = opts.crossover(a, b, rng);
      if (rng() < opts.mutationRate) child = opts.mutate(child, rng);
      next.push(child);
    }
    population = next;
    scored = population.map((g) => ({ g, f: opts.fitness(g) }));
    scored.sort((a, b) => b.f - a.f);
    if (scored[0].f > bestF) {
      best = scored[0].g;
      bestF = scored[0].f;
    }
  }
  return { best, bestFitness: bestF, generation: gen };
}
