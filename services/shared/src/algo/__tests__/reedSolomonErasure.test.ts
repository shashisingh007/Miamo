import { describe, it, expect } from 'vitest';
import {
  reedSolomonErasureEncode,
  reedSolomonErasureReconstruct,
  reedSolomonErasure,
} from '../reedSolomonErasure';

function bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

describe('reedSolomonErasure', () => {
  it('encode produces parityCount shards', () => {
    const parity = reedSolomonErasureEncode([bytes('aaaa'), bytes('bbbb')], 2);
    expect(parity.length).toBe(2);
    expect(parity[0].length).toBe(4);
  });

  it('reconstruct identity when no losses', () => {
    const data = [bytes('aaaa'), bytes('bbbb')];
    const parity = reedSolomonErasureEncode(data, 2);
    const all = [...data, ...parity];
    const out = reedSolomonErasureReconstruct(all, data.length);
    expect(Array.from(out[0])).toEqual(Array.from(data[0]));
    expect(Array.from(out[1])).toEqual(Array.from(data[1]));
  });

  it('reconstructs single data loss using parity', () => {
    const data = [bytes('hello'), bytes('world')];
    const parity = reedSolomonErasureEncode(data, 2);
    const shards: (Uint8Array | null)[] = [null, data[1], ...parity];
    const out = reedSolomonErasureReconstruct(shards, data.length);
    expect(new TextDecoder().decode(out[0])).toBe('hello');
  });

  it('reconstructs both data losses using both parity', () => {
    const data = [bytes('1234'), bytes('5678'), bytes('9abc')];
    const parity = reedSolomonErasureEncode(data, 2);
    const shards: (Uint8Array | null)[] = [null, null, data[2], parity[0], parity[1]];
    const out = reedSolomonErasureReconstruct(shards, data.length);
    expect(new TextDecoder().decode(out[0])).toBe('1234');
    expect(new TextDecoder().decode(out[1])).toBe('5678');
  });

  it('encode shard-length mismatch throws', () => {
    expect(() => reedSolomonErasureEncode([bytes('ab'), bytes('xyz')], 1)).toThrow();
  });

  it('encode with zero data shards throws', () => {
    expect(() => reedSolomonErasureEncode([], 1)).toThrow();
  });

  it('encode with parityCount=0 throws', () => {
    expect(() => reedSolomonErasureEncode([bytes('a')], 0)).toThrow();
  });

  it('reconstruct with too few shards throws', () => {
    const data = [bytes('aa'), bytes('bb')];
    const parity = reedSolomonErasureEncode(data, 2);
    const shards: (Uint8Array | null)[] = [null, null, null, parity[1]];
    expect(() => reedSolomonErasureReconstruct(shards, data.length)).toThrow();
  });

  it('reconstruct with bad dataShardCount throws', () => {
    expect(() => reedSolomonErasureReconstruct([bytes('a')], 0)).toThrow();
  });

  it('exposes object wrapper', () => {
    const data = [bytes('ab')];
    const parity = reedSolomonErasure.encode(data, 1);
    const shards: (Uint8Array | null)[] = [null, parity[0]];
    const out = reedSolomonErasure.reconstruct(shards, 1);
    expect(new TextDecoder().decode(out[0])).toBe('ab');
  });
});
