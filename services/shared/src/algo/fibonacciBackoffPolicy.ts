// Fibonacci backoff policy: delay = fib(attempt) * baseMs, capped at maxMs,
// with optional full-jitter [0, delay]. Pure (jitter takes injected rng).

export interface FibonacciBackoffConfig {
  baseMs: number;
  maxMs: number;
  jitter?: 'none' | 'full' | 'equal';
}

export interface FibonacciBackoffStep {
  attempt: number;
  rawMs: number;   // pre-cap
  cappedMs: number;
  delayMs: number; // post-jitter
}

function fib(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  let a = 0;
  let b = 1;
  for (let i = 2; i <= n; i++) {
    const t = a + b;
    a = b;
    b = t;
    if (!Number.isFinite(b)) return Number.POSITIVE_INFINITY;
  }
  return b;
}

function validate(cfg: FibonacciBackoffConfig): void {
  if (!Number.isFinite(cfg.baseMs) || cfg.baseMs <= 0) throw new Error('baseMs must be > 0');
  if (!Number.isFinite(cfg.maxMs) || cfg.maxMs <= 0) throw new Error('maxMs must be > 0');
  if (cfg.maxMs < cfg.baseMs) throw new Error('maxMs must be >= baseMs');
}

export function fibonacciBackoffDelay(
  attempt: number,
  cfg: FibonacciBackoffConfig,
  rng: () => number = Math.random
): FibonacciBackoffStep {
  validate(cfg);
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new Error('attempt must be a positive integer');
  }
  const raw = fib(attempt) * cfg.baseMs;
  const capped = Math.min(raw, cfg.maxMs);
  const mode = cfg.jitter ?? 'none';
  let delay: number;
  if (mode === 'none') {
    delay = capped;
  } else if (mode === 'full') {
    const r = clamp01(rng());
    delay = r * capped;
  } else {
    // equal jitter: half deterministic + half random
    const half = capped / 2;
    const r = clamp01(rng());
    delay = half + r * half;
  }
  return { attempt, rawMs: raw, cappedMs: capped, delayMs: delay };
}

export function fibonacciBackoffSchedule(
  attempts: number,
  cfg: FibonacciBackoffConfig,
  rng?: () => number
): FibonacciBackoffStep[] {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error('attempts must be a positive integer');
  }
  const out: FibonacciBackoffStep[] = [];
  for (let i = 1; i <= attempts; i++) out.push(fibonacciBackoffDelay(i, cfg, rng));
  return out;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
