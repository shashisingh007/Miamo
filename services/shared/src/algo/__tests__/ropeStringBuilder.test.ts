import { describe, it, expect } from 'vitest';
import { RopeStringBuilder } from '../ropeStringBuilder';

describe('RopeStringBuilder', () => {
  it('throws on non-string initial', () => {
    expect(() => new RopeStringBuilder(42 as any)).toThrow(TypeError);
  });

  it('empty rope', () => {
    const r = new RopeStringBuilder();
    expect(r.length()).toBe(0);
    expect(r.toString()).toBe('');
  });

  it('initial value', () => {
    const r = new RopeStringBuilder('hello');
    expect(r.length()).toBe(5);
    expect(r.toString()).toBe('hello');
  });

  it('append', () => {
    const r = new RopeStringBuilder('foo');
    r.append('bar');
    expect(r.toString()).toBe('foobar');
    expect(r.length()).toBe(6);
  });

  it('prepend', () => {
    const r = new RopeStringBuilder('world');
    r.prepend('hello ');
    expect(r.toString()).toBe('hello world');
  });

  it('append empty is no-op', () => {
    const r = new RopeStringBuilder('x');
    r.append('');
    expect(r.length()).toBe(1);
  });

  it('append non-string throws', () => {
    const r = new RopeStringBuilder('a');
    expect(() => r.append(42 as any)).toThrow(TypeError);
  });

  it('charAt out of range', () => {
    const r = new RopeStringBuilder('abc');
    expect(() => r.charAt(-1)).toThrow(RangeError);
    expect(() => r.charAt(3)).toThrow(RangeError);
    expect(() => r.charAt(1.5)).toThrow(RangeError);
  });

  it('charAt basic', () => {
    const r = new RopeStringBuilder('foo');
    r.append('bar');
    r.append('baz');
    expect(r.charAt(0)).toBe('f');
    expect(r.charAt(3)).toBe('b');
    expect(r.charAt(6)).toBe('b');
    expect(r.charAt(8)).toBe('z');
  });

  it('substring basic', () => {
    const r = new RopeStringBuilder('hello ');
    r.append('cruel ');
    r.append('world');
    expect(r.substring(0, 5)).toBe('hello');
    expect(r.substring(6, 11)).toBe('cruel');
    expect(r.substring(0, r.length())).toBe('hello cruel world');
  });

  it('substring start == end empty', () => {
    const r = new RopeStringBuilder('abc');
    expect(r.substring(2, 2)).toBe('');
  });

  it('substring spanning boundary', () => {
    const r = new RopeStringBuilder('ab');
    r.append('cd');
    r.append('ef');
    expect(r.substring(1, 5)).toBe('bcde');
  });

  it('substring throws on bad range', () => {
    const r = new RopeStringBuilder('abc');
    expect(() => r.substring(-1, 2)).toThrow(RangeError);
    expect(() => r.substring(0, 4)).toThrow(RangeError);
    expect(() => r.substring(2, 1)).toThrow(RangeError);
    expect(() => r.substring(1.5, 2)).toThrow(TypeError);
  });

  it('many appends produce correct string', () => {
    const r = new RopeStringBuilder();
    let s = '';
    for (let i = 0; i < 1000; i += 1) {
      const t = String(i);
      r.append(t);
      s += t;
    }
    expect(r.length()).toBe(s.length);
    expect(r.toString()).toBe(s);
  });

  it('charAt matches toString in random access', () => {
    const r = new RopeStringBuilder('alpha');
    r.append('beta');
    r.append('gamma');
    r.prepend('start-');
    const s = r.toString();
    for (let i = 0; i < s.length; i += 1) expect(r.charAt(i)).toBe(s[i]);
  });

  it('substring beyond append chain', () => {
    const r = new RopeStringBuilder('');
    for (const c of 'abcdefghij') r.append(c);
    expect(r.substring(3, 7)).toBe('defg');
  });
});
