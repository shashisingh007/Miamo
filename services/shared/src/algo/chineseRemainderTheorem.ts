import { extendedEuclideanGcd } from './extendedEuclideanGcd';

export interface CongruenceSystemEntry {
  remainder: number;
  modulus: number;
}

export interface ChineseRemainderResult {
  remainder: number;
  modulus: number;
}

export function chineseRemainderTheorem(entries: CongruenceSystemEntry[]): ChineseRemainderResult {
  if (entries.length === 0) throw new RangeError('entries must be non-empty');
  for (const e of entries) {
    if (!Number.isInteger(e.remainder) || !Number.isInteger(e.modulus)) {
      throw new RangeError('remainder and modulus must be integers');
    }
    if (e.modulus <= 0) throw new RangeError('modulus must be > 0');
  }
  let r = ((entries[0].remainder % entries[0].modulus) + entries[0].modulus) % entries[0].modulus;
  let m = entries[0].modulus;
  for (let i = 1; i < entries.length; i++) {
    const r2 = ((entries[i].remainder % entries[i].modulus) + entries[i].modulus) % entries[i].modulus;
    const m2 = entries[i].modulus;
    const { gcd, x } = extendedEuclideanGcd(m, m2);
    const diff = r2 - r;
    if (diff % gcd !== 0) throw new RangeError('no solution: incompatible congruences');
    const lcm = (m / gcd) * m2;
    const k = ((diff / gcd) * x) % (m2 / gcd);
    r = ((r + m * k) % lcm + lcm) % lcm;
    m = lcm;
  }
  return { remainder: r, modulus: m };
}
