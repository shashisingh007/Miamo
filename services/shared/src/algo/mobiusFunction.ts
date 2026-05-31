export function mobiusFunction(n: number): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('mobiusFunction: n must be a positive integer');
  }
  if (n === 1) return 1;
  let primeFactors = 0;
  let x = n;
  for (let p = 2; p * p <= x; p += 1) {
    if (x % p === 0) {
      x = Math.floor(x / p);
      if (x % p === 0) return 0;
      primeFactors += 1;
    }
  }
  if (x > 1) primeFactors += 1;
  return primeFactors % 2 === 0 ? 1 : -1;
}

export function mobiusSieve(limit: number): number[] {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('mobiusSieve: limit must be a positive integer');
  }
  const mu: number[] = new Array(limit + 1).fill(1);
  mu[0] = 0;
  for (let p = 2; p <= limit; p += 1) {
    if (mu[p] === 1 || mu[p] === -1) {
      // not yet touched as composite — treat all unmarked entries; we need different signal.
    }
  }
  const isComposite = new Array(limit + 1).fill(false);
  const primes: number[] = [];
  for (let i = 2; i <= limit; i += 1) mu[i] = 1;
  for (let i = 2; i <= limit; i += 1) {
    if (!isComposite[i]) {
      primes.push(i);
      mu[i] = -1;
    }
    for (const p of primes) {
      const ip = i * p;
      if (ip > limit) break;
      isComposite[ip] = true;
      if (i % p === 0) {
        mu[ip] = 0;
        break;
      } else {
        mu[ip] = mu[i] === 0 ? 0 : -mu[i];
      }
    }
  }
  return mu;
}
