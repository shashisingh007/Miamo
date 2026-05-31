import { describe, it, expect } from 'vitest';
import { rleEncode, rleDecode } from '../runLengthEncoder';

describe('runLengthEncoder', () => {
  it('encodes empty', () => {
    expect(rleEncode(new Uint8Array()).length).toBe(0);
  });

  it('decodes empty', () => {
    expect(rleDecode(new Uint8Array()).length).toBe(0);
  });

  it('rejects non-Uint8Array encode', () => {
    expect(() => rleEncode([1, 2, 3] as any)).toThrow();
  });

  it('rejects non-Uint8Array decode', () => {
    expect(() => rleDecode([1, 2, 3] as any)).toThrow();
  });

  it('round-trip single byte', () => {
    const b = new Uint8Array([42]);
    expect(Array.from(rleDecode(rleEncode(b)))).toEqual([42]);
  });

  it('round-trip short literal', () => {
    const b = new Uint8Array([1, 2, 3]);
    expect(Array.from(rleDecode(rleEncode(b)))).toEqual([1, 2, 3]);
  });

  it('round-trip long literal', () => {
    const b = new Uint8Array(300);
    for (let i = 0; i < b.length; i++) b[i] = i & 0xff;
    expect(Array.from(rleDecode(rleEncode(b)))).toEqual(Array.from(b));
  });

  it('round-trip pure run', () => {
    const b = new Uint8Array(50).fill(7);
    expect(Array.from(rleDecode(rleEncode(b)))).toEqual(Array.from(b));
  });

  it('round-trip mixed literal + run', () => {
    const b = new Uint8Array([1, 2, 3, 9, 9, 9, 9, 9, 5, 4]);
    expect(Array.from(rleDecode(rleEncode(b)))).toEqual(Array.from(b));
  });

  it('compresses long run', () => {
    const b = new Uint8Array(100).fill(0xaa);
    const enc = rleEncode(b);
    expect(enc.length).toBeLessThan(b.length);
  });

  it('uses literal token for non-repeating data', () => {
    const b = new Uint8Array([1, 2, 3]);
    const enc = rleEncode(b);
    expect(enc[0]).toBe(3);
  });

  it('uses run token for repeats >= 3', () => {
    const b = new Uint8Array([7, 7, 7]);
    const enc = rleEncode(b);
    expect(enc[0]).toBe(254);
    expect(enc[1]).toBe(7);
  });

  it('run token math: 3 reps => 254 byte', () => {
    const b = new Uint8Array([7, 7, 7]);
    const enc = rleEncode(b);
    expect(enc[0]).toBe(254);
    expect(enc[1]).toBe(7);
  });

  it('128-rep run => single token with byte 129', () => {
    const b = new Uint8Array(128).fill(9);
    const enc = rleEncode(b);
    expect(enc[0]).toBe(129);
    expect(enc[1]).toBe(9);
    expect(enc.length).toBe(2);
  });

  it('129-rep run splits into two tokens', () => {
    const b = new Uint8Array(129).fill(5);
    const enc = rleEncode(b);
    expect(rleDecode(enc).length).toBe(129);
  });

  it('128-byte literal => single token with byte 128', () => {
    const arr: number[] = [];
    for (let i = 0; i < 128; i++) arr.push(i);
    const b = Uint8Array.from(arr);
    const enc = rleEncode(b);
    expect(enc[0]).toBe(128);
    expect(enc.length).toBe(1 + 128);
  });

  it('decode rejects truncated literal', () => {
    expect(() => rleDecode(new Uint8Array([5, 1, 2]))).toThrow();
  });

  it('decode rejects truncated run', () => {
    expect(() => rleDecode(new Uint8Array([254]))).toThrow();
  });

  it('decode skips noop token (0)', () => {
    const enc = new Uint8Array([0, 2, 1, 2]);
    expect(Array.from(rleDecode(enc))).toEqual([1, 2]);
  });

  it('round-trip random data', () => {
    const b = new Uint8Array(1024);
    for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    expect(Array.from(rleDecode(rleEncode(b)))).toEqual(Array.from(b));
  });

  it('round-trip alternating bytes', () => {
    const b = new Uint8Array(100);
    for (let i = 0; i < b.length; i++) b[i] = i % 2;
    expect(Array.from(rleDecode(rleEncode(b)))).toEqual(Array.from(b));
  });

  it('round-trip pattern with embedded runs', () => {
    const b = new Uint8Array([1, 2, 3, 4, 4, 4, 4, 4, 5, 6, 7, 7, 7, 8]);
    expect(Array.from(rleDecode(rleEncode(b)))).toEqual(Array.from(b));
  });

  it('handles run of exactly 2 (kept as literal)', () => {
    const b = new Uint8Array([5, 5]);
    const enc = rleEncode(b);
    expect(enc[0]).toBe(2); // literal
    expect(Array.from(rleDecode(enc))).toEqual([5, 5]);
  });

  it('compresses 1000-byte uniform stream a lot', () => {
    const b = new Uint8Array(1000).fill(0x42);
    const enc = rleEncode(b);
    expect(enc.length).toBeLessThan(20);
    expect(Array.from(rleDecode(enc))).toEqual(Array.from(b));
  });
});
