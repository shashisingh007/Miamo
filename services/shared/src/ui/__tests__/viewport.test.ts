import { describe, it, expect } from 'vitest';
import { viewportClass, classMinWidth, qaWidthsForClass, QA_WIDTHS, VIEWPORT_BREAKS } from '../viewport';

describe('viewportClass', () => {
  it('maps phone widths to xs/sm', () => {
    expect(viewportClass(320)).toBe('xs');
    expect(viewportClass(360)).toBe('xs');
    expect(viewportClass(479)).toBe('xs');
    expect(viewportClass(480)).toBe('sm');
    expect(viewportClass(639)).toBe('sm');
  });
  it('maps tablet widths to md', () => {
    expect(viewportClass(640)).toBe('md');
    expect(viewportClass(768)).toBe('md');
  });
  it('maps laptop widths to lg', () => {
    expect(viewportClass(960)).toBe('lg');
    expect(viewportClass(1280)).toBe('xl');
  });
  it('maps 4K to xxxl', () => {
    expect(viewportClass(2560)).toBe('xxxl');
    expect(viewportClass(3840)).toBe('xxxl');
  });
  it('defends against null / negative / NaN', () => {
    expect(viewportClass(null)).toBe('xs');
    expect(viewportClass(undefined)).toBe('xs');
    expect(viewportClass(-100)).toBe('xs');
    expect(viewportClass(Number.NaN)).toBe('xs');
  });
});

describe('classMinWidth', () => {
  it('returns 0 for xs', () => {
    expect(classMinWidth('xs')).toBe(0);
  });
  it('returns previous break upper bound', () => {
    expect(classMinWidth('sm')).toBe(480);
    expect(classMinWidth('md')).toBe(640);
    expect(classMinWidth('xxxl')).toBe(2048);
  });
});

describe('qaWidthsForClass', () => {
  it('returns QA widths inside each class', () => {
    const xs = qaWidthsForClass('xs');
    expect(xs).toContain(320);
    expect(xs).toContain(360);
    expect(xs).toContain(414);
  });
  it('covers every QA width across all classes', () => {
    const all: number[] = [];
    for (const { cls } of VIEWPORT_BREAKS) all.push(...qaWidthsForClass(cls));
    for (const w of QA_WIDTHS) expect(all).toContain(w);
  });
});
