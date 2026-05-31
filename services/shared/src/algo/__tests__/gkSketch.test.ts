import { describe, it, expect } from 'vitest';
import { GkSketch, gkSketch } from '../gkSketch';

describe('GkSketch', () => {
  it('throws on bad epsilon', () => {
    expect(() => new GkSketch(0)).toThrow();
    expect(() => new GkSketch(-0.1)).toThrow();
    expect(() => new GkSketch(0.5)).toThrow();
    expect(() => new GkSketch(NaN)).toThrow();
  });

  it('throws on non-finite add', () => {
    const s = new GkSketch(0.05);
    expect(() => s.add(NaN)).toThrow();
  });

  it('total tracks count', () => {
    const s = new GkSketch(0.1);
    [1, 2, 3].forEach((v) => s.add(v));
    expect(s.total()).toBe(3);
  });

  it('empty quantile throws', () => {
    expect(() => new GkSketch(0.1).quantile(0.5)).toThrow();
  });

  it('q out of range throws', () => {
    const s = new GkSketch(0.1);
    s.add(1);
    expect(() => s.quantile(-0.1)).toThrow();
    expect(() => s.quantile(1.1)).toThrow();
  });

  it('single value', () => {
    const s = new GkSketch(0.1);
    s.add(42);
    expect(s.quantile(0.5)).toBe(42);
  });

  it('approximates median of 1..100', () => {
    const s = new GkSketch(0.05);
    for (let i = 1; i <= 100; i++) s.add(i);
    const m = s.quantile(0.5);
    expect(m).toBeGreaterThanOrEqual(40);
    expect(m).toBeLessThanOrEqual(60);
  });

  it('approximates p=0.9 of 1..1000', () => {
    const s = new GkSketch(0.01);
    for (let i = 1; i <= 1000; i++) s.add(i);
    const v = s.quantile(0.9);
    expect(v).toBeGreaterThanOrEqual(870);
    expect(v).toBeLessThanOrEqual(930);
  });

  it('approximates p=0.1 of 1..1000', () => {
    const s = new GkSketch(0.01);
    for (let i = 1; i <= 1000; i++) s.add(i);
    const v = s.quantile(0.1);
    expect(v).toBeGreaterThanOrEqual(70);
    expect(v).toBeLessThanOrEqual(130);
  });

  it('handles reversed stream', () => {
    const s = new GkSketch(0.05);
    for (let i = 1000; i >= 1; i--) s.add(i);
    const m = s.quantile(0.5);
    expect(m).toBeGreaterThanOrEqual(400);
    expect(m).toBeLessThanOrEqual(600);
  });

  it('handles duplicates', () => {
    const s = new GkSketch(0.1);
    for (let i = 0; i < 50; i++) s.add(7);
    expect(s.quantile(0.5)).toBe(7);
  });

  it('handles negatives', () => {
    const s = new GkSketch(0.05);
    for (let i = -100; i <= 100; i++) s.add(i);
    const m = s.quantile(0.5);
    expect(m).toBeGreaterThanOrEqual(-30);
    expect(m).toBeLessThanOrEqual(30);
  });

  it('size is non-negative', () => {
    const s = new GkSketch(0.1);
    for (let i = 1; i <= 100; i++) s.add(i);
    expect(s.size()).toBeGreaterThan(0);
    expect(s.size()).toBeLessThanOrEqual(100);
  });

  it('q=0 returns min-ish', () => {
    const s = gkSketch([5, 1, 4, 2, 3], 0.1);
    expect(s.quantile(0)).toBeLessThanOrEqual(2);
  });

  it('q=1 returns max-ish', () => {
    const s = gkSketch([5, 1, 4, 2, 3], 0.1);
    expect(s.quantile(1)).toBeGreaterThanOrEqual(4);
  });
});
