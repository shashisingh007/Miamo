export function sieveOfEratosthenes(limit: number): number[] {
  if (!Number.isInteger(limit)) throw new RangeError('limit must be an integer');
  if (limit < 2) return [];
  const isComposite = new Uint8Array(limit + 1);
  const primes: number[] = [];
  for (let i = 2; i <= limit; i++) {
    if (isComposite[i] === 0) {
      primes.push(i);
      if (i * i <= limit) {
        for (let j = i * i; j <= limit; j += i) isComposite[j] = 1;
      }
    }
  }
  return primes;
}

export function isPrimeSieved(limit: number, n: number): boolean {
  if (!Number.isInteger(limit) || !Number.isInteger(n)) throw new RangeError('limit and n must be integers');
  if (n < 0 || n > limit) throw new RangeError('n out of range');
  if (n < 2) return false;
  const sieve = sieveOfEratosthenes(limit);
  // Binary search since sieve is sorted ascending.
  let lo = 0;
  let hi = sieve.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (sieve[mid] === n) return true;
    if (sieve[mid] < n) lo = mid + 1; else hi = mid - 1;
  }
  return false;
}
