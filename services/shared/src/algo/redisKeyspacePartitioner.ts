/**
 * redisKeyspacePartitioner \u2014 Phase 18 hash-based Redis key partitioner
 * (pure).
 *
 * Produces a deterministic partition index in [0, partitions) for a given
 * logical key, optionally honouring a "hash tag" inside braces \u2014 the same
 * convention Redis Cluster uses, so {user:42}:* keys all land on the same
 * shard.
 *
 *   partitionFor('{user:42}:cache:profile', 16) === partitionFor('{user:42}:tl', 16)
 */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnv1a(s: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME) >>> 0;
  }
  return h >>> 0;
}

export function extractHashTag(key: string): string {
  const lb = key.indexOf('{');
  if (lb === -1) return key;
  const rb = key.indexOf('}', lb + 1);
  if (rb === -1 || rb === lb + 1) return key;
  return key.slice(lb + 1, rb);
}

export type PartitionResult = {
  partition: number;
  hashTag: string;
};

export function partitionFor(key: string, partitions: number): PartitionResult {
  const p = Math.max(1, Math.floor(partitions));
  if (typeof key !== 'string' || key.length === 0) {
    return { partition: 0, hashTag: '' };
  }
  const tag = extractHashTag(key);
  const h = fnv1a(tag);
  return { partition: h % p, hashTag: tag };
}

export function groupKeysByPartition(
  keys: ReadonlyArray<string>,
  partitions: number,
): Map<number, string[]> {
  const out = new Map<number, string[]>();
  for (const k of keys) {
    const { partition } = partitionFor(k, partitions);
    const bucket = out.get(partition);
    if (bucket) bucket.push(k);
    else out.set(partition, [k]);
  }
  return out;
}
