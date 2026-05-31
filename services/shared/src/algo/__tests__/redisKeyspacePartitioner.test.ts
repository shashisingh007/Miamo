import { describe, it, expect } from 'vitest';
import {
  partitionFor,
  extractHashTag,
  groupKeysByPartition,
} from '../redisKeyspacePartitioner';

describe('redisKeyspacePartitioner', () => {
  it('returns partition < partitions', () => {
    for (let i = 0; i < 100; i++) {
      const { partition } = partitionFor(`key:${i}`, 16);
      expect(partition).toBeGreaterThanOrEqual(0);
      expect(partition).toBeLessThan(16);
    }
  });

  it('deterministic for the same key', () => {
    const a = partitionFor('foo:bar', 32);
    const b = partitionFor('foo:bar', 32);
    expect(a.partition).toBe(b.partition);
  });

  it('hash-tag co-locates keys', () => {
    const a = partitionFor('{user:42}:cache:profile', 16);
    const b = partitionFor('{user:42}:timeline', 16);
    const c = partitionFor('{user:42}:counter', 16);
    expect(a.partition).toBe(b.partition);
    expect(b.partition).toBe(c.partition);
    expect(a.hashTag).toBe('user:42');
  });

  it('different hash tags can land in different partitions', () => {
    // Probabilistic but with FNV-1a and 1024 partitions we essentially
    // guarantee inequality for two short distinct strings.
    const a = partitionFor('{user:42}:x', 1024);
    const b = partitionFor('{user:43}:x', 1024);
    expect(a.partition).not.toBe(b.partition);
  });

  it('extractHashTag returns inner-brace content', () => {
    expect(extractHashTag('{abc}:rest')).toBe('abc');
  });

  it('extractHashTag with empty braces -> falls back to whole key', () => {
    expect(extractHashTag('{}:rest')).toBe('{}:rest');
  });

  it('extractHashTag with no closing brace -> whole key', () => {
    expect(extractHashTag('{unclosed:rest')).toBe('{unclosed:rest');
  });

  it('empty key -> partition 0', () => {
    const r = partitionFor('', 16);
    expect(r.partition).toBe(0);
  });

  it('partitions floor is 1', () => {
    const r = partitionFor('foo', 0);
    expect(r.partition).toBe(0);
  });

  it('groupKeysByPartition buckets correctly', () => {
    const keys = ['{u:1}:a', '{u:1}:b', '{u:2}:a', '{u:2}:b', '{u:3}:a'];
    const grouped = groupKeysByPartition(keys, 4);
    let total = 0;
    for (const v of grouped.values()) total += v.length;
    expect(total).toBe(5);
    // u:1 keys share partition
    const p1 = partitionFor('{u:1}:a', 4).partition;
    expect(grouped.get(p1)?.includes('{u:1}:a')).toBe(true);
    expect(grouped.get(p1)?.includes('{u:1}:b')).toBe(true);
  });

  it('distribution is reasonably balanced over many keys', () => {
    const counts = new Array<number>(8).fill(0);
    for (let i = 0; i < 8000; i++) counts[partitionFor(`k:${i}`, 8).partition]++;
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    expect(max / min).toBeLessThan(2); // generous balance bound
  });

  it('numeric "partitions" coerced via floor', () => {
    const r = partitionFor('foo', 3.9);
    expect(r.partition).toBeLessThan(3);
  });
});
