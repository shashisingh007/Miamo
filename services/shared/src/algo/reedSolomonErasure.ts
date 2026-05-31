// Reed-Solomon erasure coding over GF(2^8) with a fixed primitive polynomial.
// Encodes k data shards into k+m total shards; can reconstruct from any k
// surviving shards (data or parity). Uses a Vandermonde-style coding matrix
// reduced to identity in the top k rows so data shards pass through.

const POLY = 0x11d;

const expTable = new Uint8Array(512);
const logTable = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    expTable[i] = x;
    logTable[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= POLY;
  }
  for (let i = 255; i < 512; i += 1) expTable[i] = expTable[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return expTable[logTable[a] + logTable[b]];
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('reedSolomonErasure: division by zero');
  if (a === 0) return 0;
  return expTable[(logTable[a] - logTable[b] + 255) % 255];
}

function buildMatrix(k: number, total: number): Uint8Array[] {
  // Vandermonde matrix V_{i,j} = i^j over GF(2^8)
  const v: Uint8Array[] = [];
  for (let i = 0; i < total; i += 1) {
    const row = new Uint8Array(k);
    let pow = 1;
    for (let j = 0; j < k; j += 1) {
      row[j] = pow;
      pow = gfMul(pow, i + 1);
    }
    v.push(row);
  }
  // Make top-k square submatrix identity by inverting it and multiplying.
  const top = v.slice(0, k).map((r) => Uint8Array.from(r));
  const inv = invertMatrix(top, k);
  const out: Uint8Array[] = [];
  for (let r = 0; r < total; r += 1) {
    const newRow = new Uint8Array(k);
    for (let c = 0; c < k; c += 1) {
      let s = 0;
      for (let i = 0; i < k; i += 1) s ^= gfMul(v[r][i], inv[i][c]);
      newRow[c] = s;
    }
    out.push(newRow);
  }
  return out;
}

function invertMatrix(m: Uint8Array[], n: number): Uint8Array[] {
  const a: Uint8Array[] = m.map((r) => Uint8Array.from(r));
  const inv: Uint8Array[] = [];
  for (let i = 0; i < n; i += 1) {
    const row = new Uint8Array(n);
    row[i] = 1;
    inv.push(row);
  }
  for (let i = 0; i < n; i += 1) {
    if (a[i][i] === 0) {
      let swap = -1;
      for (let r = i + 1; r < n; r += 1) {
        if (a[r][i] !== 0) {
          swap = r;
          break;
        }
      }
      if (swap === -1) throw new Error('reedSolomonErasure: matrix singular (need more independent shards)');
      [a[i], a[swap]] = [a[swap], a[i]];
      [inv[i], inv[swap]] = [inv[swap], inv[i]];
    }
    const pivInv = gfDiv(1, a[i][i]);
    for (let c = 0; c < n; c += 1) {
      a[i][c] = gfMul(a[i][c], pivInv);
      inv[i][c] = gfMul(inv[i][c], pivInv);
    }
    for (let r = 0; r < n; r += 1) {
      if (r === i) continue;
      const factor = a[r][i];
      if (factor === 0) continue;
      for (let c = 0; c < n; c += 1) {
        a[r][c] ^= gfMul(factor, a[i][c]);
        inv[r][c] ^= gfMul(factor, inv[i][c]);
      }
    }
  }
  return inv;
}

export function reedSolomonErasureEncode(dataShards: ReadonlyArray<Uint8Array>, parityCount: number): Uint8Array[] {
  if (dataShards.length === 0) throw new Error('reedSolomonErasure: need at least one data shard');
  if (parityCount <= 0) throw new Error('reedSolomonErasure: parityCount must be > 0');
  const shardLen = dataShards[0].length;
  for (const s of dataShards) {
    if (s.length !== shardLen) throw new Error('reedSolomonErasure: all shards must be same length');
  }
  const k = dataShards.length;
  const total = k + parityCount;
  if (total > 255) throw new Error('reedSolomonErasure: total shards must be <= 255');
  const matrix = buildMatrix(k, total);
  const parity: Uint8Array[] = [];
  for (let r = k; r < total; r += 1) {
    const row = matrix[r];
    const out = new Uint8Array(shardLen);
    for (let pos = 0; pos < shardLen; pos += 1) {
      let v = 0;
      for (let i = 0; i < k; i += 1) v ^= gfMul(row[i], dataShards[i][pos]);
      out[pos] = v;
    }
    parity.push(out);
  }
  return parity;
}

export function reedSolomonErasureReconstruct(
  shards: ReadonlyArray<Uint8Array | null>,
  dataShardCount: number,
): Uint8Array[] {
  const total = shards.length;
  const parityCount = total - dataShardCount;
  if (dataShardCount <= 0) throw new Error('reedSolomonErasure: dataShardCount must be > 0');
  if (parityCount < 0) throw new Error('reedSolomonErasure: shards.length must be >= dataShardCount');
  const present: number[] = [];
  let shardLen = -1;
  for (let i = 0; i < total; i += 1) {
    if (shards[i] !== null) {
      present.push(i);
      if (shardLen === -1) shardLen = shards[i]!.length;
      else if (shards[i]!.length !== shardLen) throw new Error('reedSolomonErasure: shard length mismatch');
    }
  }
  if (present.length < dataShardCount) {
    throw new Error('reedSolomonErasure: need at least dataShardCount surviving shards');
  }
  const chosen = present.slice(0, dataShardCount);
  const matrix = buildMatrix(dataShardCount, total);
  const sub: Uint8Array[] = chosen.map((idx) => Uint8Array.from(matrix[idx]));
  const inv = invertMatrix(sub, dataShardCount);

  const out: Uint8Array[] = [];
  for (let r = 0; r < dataShardCount; r += 1) {
    if (shards[r] !== null) {
      out.push(Uint8Array.from(shards[r]!));
      continue;
    }
    const row = new Uint8Array(shardLen);
    for (let pos = 0; pos < shardLen; pos += 1) {
      let v = 0;
      for (let j = 0; j < dataShardCount; j += 1) {
        v ^= gfMul(inv[r][j], shards[chosen[j]]![pos]);
      }
      row[pos] = v;
    }
    out.push(row);
  }
  return out;
}

export const reedSolomonErasure = {
  encode: reedSolomonErasureEncode,
  reconstruct: reedSolomonErasureReconstruct,
};
