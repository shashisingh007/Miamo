export interface AtkinResult {
  primes: number[];
  count: number;
}

export function sieveOfAtkin(limit: number): AtkinResult {
  if (!Number.isInteger(limit)) throw new Error('sieveOfAtkin: integer limit required');
  if (limit < 0) throw new Error('sieveOfAtkin: limit must be >= 0');
  if (limit < 2) return { primes: [], count: 0 };
  const sieve = new Uint8Array(limit + 1);
  const sqrtLim = Math.floor(Math.sqrt(limit));
  for (let x = 1; x <= sqrtLim; x++) {
    for (let y = 1; y <= sqrtLim; y++) {
      let n = 4 * x * x + y * y;
      if (n <= limit && (n % 12 === 1 || n % 12 === 5)) sieve[n] ^= 1;
      n = 3 * x * x + y * y;
      if (n <= limit && n % 12 === 7) sieve[n] ^= 1;
      n = 3 * x * x - y * y;
      if (x > y && n <= limit && n % 12 === 11) sieve[n] ^= 1;
    }
  }
  for (let r = 5; r <= sqrtLim; r++) {
    if (sieve[r]) {
      const r2 = r * r;
      for (let i = r2; i <= limit; i += r2) sieve[i] = 0;
    }
  }
  const primes: number[] = [];
  if (limit >= 2) primes.push(2);
  if (limit >= 3) primes.push(3);
  for (let i = 5; i <= limit; i++) if (sieve[i]) primes.push(i);
  return { primes, count: primes.length };
}
