import { describe, it, expect } from 'vitest';
import { classifyRequestBodySize } from '../requestBodySizeClassifier';

const OPTS = {
  smallMaxBytes: 1024,
  mediumMaxBytes: 64 * 1024,
  largeMaxBytes: 1024 * 1024,
  hardMaxBytes: 10 * 1024 * 1024,
};

describe('requestBodySizeClassifier', () => {
  it('0 -> empty accepted', () => {
    const r = classifyRequestBodySize(0, OPTS);
    expect(r.band).toBe('empty');
    expect(r.accepted).toBe(true);
  });

  it('small body', () => {
    expect(classifyRequestBodySize(500, OPTS).band).toBe('small');
  });

  it('medium body', () => {
    expect(classifyRequestBodySize(50_000, OPTS).band).toBe('medium');
  });

  it('large body', () => {
    expect(classifyRequestBodySize(500_000, OPTS).band).toBe('large');
  });

  it('oversize -> rejected', () => {
    const r = classifyRequestBodySize(20 * 1024 * 1024, OPTS);
    expect(r.band).toBe('oversize');
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('oversize');
  });

  it('accepts string content-length', () => {
    expect(classifyRequestBodySize('500', OPTS).band).toBe('small');
  });

  it('rejects invalid string', () => {
    const r = classifyRequestBodySize('abc', OPTS);
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('invalid');
  });

  it('rejects negative', () => {
    const r = classifyRequestBodySize(-5, OPTS);
    expect(r.reason).toBe('invalid');
  });

  it('rejects NaN', () => {
    const r = classifyRequestBodySize(NaN, OPTS);
    expect(r.reason).toBe('invalid');
  });

  it('null/undefined treated as 0', () => {
    expect(classifyRequestBodySize(null, OPTS).band).toBe('empty');
    expect(classifyRequestBodySize(undefined, OPTS).band).toBe('empty');
  });

  it('boundary at small max', () => {
    expect(classifyRequestBodySize(1024, OPTS).band).toBe('small');
    expect(classifyRequestBodySize(1025, OPTS).band).toBe('medium');
  });

  it('hardMax floor=1', () => {
    const r = classifyRequestBodySize(2, { hardMaxBytes: 0 });
    expect(r.band).toBe('oversize');
  });

  it('rejects unknown type', () => {
    const r = classifyRequestBodySize({} as any, OPTS);
    expect(r.reason).toBe('invalid');
  });
});
