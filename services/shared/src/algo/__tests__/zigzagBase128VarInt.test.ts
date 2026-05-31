import { describe, it, expect } from 'vitest';
import {
  encodeVarUint,
  decodeVarUint,
  encodeVarInt,
  decodeVarInt,
  zigZagEncode,
  zigZagDecode,
} from '../zigzagBase128VarInt';

describe('zigzagBase128VarInt', () => {
  it('encodes 0 as 1 byte', () => {
    expect(Array.from(encodeVarUint(0))).toEqual([0x00]);
  });

  it('encodes 127 as single byte', () => {
    expect(Array.from(encodeVarUint(127))).toEqual([0x7f]);
  });

  it('encodes 128 as 2 bytes', () => {
    expect(Array.from(encodeVarUint(128))).toEqual([0x80, 0x01]);
  });

  it('encodes 300 as 2 bytes (proto example)', () => {
    expect(Array.from(encodeVarUint(300))).toEqual([0xac, 0x02]);
  });

  it('encodes 16384 as 3 bytes', () => {
    expect(Array.from(encodeVarUint(16384))).toEqual([0x80, 0x80, 0x01]);
  });

  it('rejects negative', () => {
    expect(() => encodeVarUint(-1)).toThrow();
  });

  it('rejects non-integer', () => {
    expect(() => encodeVarUint(1.5)).toThrow();
  });

  it('rejects > MAX_SAFE_INTEGER', () => {
    expect(() => encodeVarUint(Number.MAX_SAFE_INTEGER + 100)).toThrow();
  });

  it('round-trip 0..1000', () => {
    for (let i = 0; i < 1000; i++) {
      const { value, bytesRead } = decodeVarUint(encodeVarUint(i));
      expect(value).toBe(i);
      expect(bytesRead).toBeGreaterThan(0);
    }
  });

  it('round-trip large value', () => {
    const v = 2 ** 40 - 7;
    const { value } = decodeVarUint(encodeVarUint(v));
    expect(value).toBe(v);
  });

  it('decode rejects truncated stream', () => {
    expect(() => decodeVarUint(new Uint8Array([0x80, 0x80]))).toThrow();
  });

  it('decode rejects non-Uint8Array', () => {
    expect(() => decodeVarUint([0x00] as any)).toThrow();
  });

  it('decode rejects bad offset', () => {
    expect(() => decodeVarUint(new Uint8Array([0x00]), -1)).toThrow();
    expect(() => decodeVarUint(new Uint8Array([0x00]), 5)).toThrow();
  });

  it('decode with offset reads at offset', () => {
    const buf = new Uint8Array([0xff, 0xac, 0x02]); // padding then 300
    const { value, bytesRead } = decodeVarUint(buf, 1);
    expect(value).toBe(300);
    expect(bytesRead).toBe(2);
  });

  it('zigZagEncode 0..3', () => {
    expect(zigZagEncode(0)).toBe(0);
    expect(zigZagEncode(-1)).toBe(1);
    expect(zigZagEncode(1)).toBe(2);
    expect(zigZagEncode(-2)).toBe(3);
    expect(zigZagEncode(2)).toBe(4);
  });

  it('zigZagDecode inverse', () => {
    for (let v = -100; v <= 100; v++) {
      expect(zigZagDecode(zigZagEncode(v))).toBe(v);
    }
  });

  it('zigZagDecode rejects negative', () => {
    expect(() => zigZagDecode(-1)).toThrow();
  });

  it('zigZagEncode rejects non-integer', () => {
    expect(() => zigZagEncode(1.5)).toThrow();
  });

  it('encodeVarInt round-trip negative', () => {
    const { value } = decodeVarInt(encodeVarInt(-12345));
    expect(value).toBe(-12345);
  });

  it('encodeVarInt round-trip positive', () => {
    const { value } = decodeVarInt(encodeVarInt(12345));
    expect(value).toBe(12345);
  });

  it('encodeVarInt round-trip zero', () => {
    const { value } = decodeVarInt(encodeVarInt(0));
    expect(value).toBe(0);
  });

  it('chained decode reads multiple values', () => {
    const a = encodeVarUint(300);
    const b = encodeVarUint(7);
    const buf = new Uint8Array(a.length + b.length);
    buf.set(a, 0);
    buf.set(b, a.length);
    const first = decodeVarUint(buf, 0);
    expect(first.value).toBe(300);
    const second = decodeVarUint(buf, first.bytesRead);
    expect(second.value).toBe(7);
  });

  it('bytesRead matches encoded length', () => {
    for (const v of [0, 1, 127, 128, 16384, 1 << 20]) {
      const enc = encodeVarUint(v);
      expect(decodeVarUint(enc).bytesRead).toBe(enc.length);
    }
  });

  it('rejects varint longer than 10 bytes', () => {
    const buf = new Uint8Array(12).fill(0xff);
    expect(() => decodeVarUint(buf)).toThrow();
  });
});
