import { describe, it, expect } from 'vitest';
import {
  hslToRgb,
  rgbToHsl,
  rgbToHex,
  hexToRgb,
} from '../hslRgbColorConverter';

describe('hslRgbColorConverter', () => {
  it('hslToRgb black', () => {
    expect(hslToRgb({ h: 0, s: 0, l: 0 })).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('hslToRgb white', () => {
    expect(hslToRgb({ h: 0, s: 0, l: 100 })).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('hslToRgb gray (no saturation)', () => {
    expect(hslToRgb({ h: 0, s: 0, l: 50 })).toEqual({ r: 128, g: 128, b: 128 });
  });

  it('hslToRgb pure red', () => {
    expect(hslToRgb({ h: 0, s: 100, l: 50 })).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('hslToRgb pure green', () => {
    expect(hslToRgb({ h: 120, s: 100, l: 50 })).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('hslToRgb pure blue', () => {
    expect(hslToRgb({ h: 240, s: 100, l: 50 })).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('normalizes negative hue', () => {
    expect(hslToRgb({ h: -120, s: 100, l: 50 })).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('normalizes hue >= 360', () => {
    expect(hslToRgb({ h: 480, s: 100, l: 50 })).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('clamps saturation > 100', () => {
    expect(hslToRgb({ h: 0, s: 200, l: 50 })).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('throws on non-finite components', () => {
    expect(() => hslToRgb({ h: NaN, s: 0, l: 0 })).toThrow();
  });

  it('rgbToHsl black', () => {
    expect(rgbToHsl({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, l: 0 });
  });

  it('rgbToHsl white', () => {
    expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 });
  });

  it('rgbToHsl pure red', () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
  });

  it('rgbToHsl pure green', () => {
    expect(rgbToHsl({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, l: 50 });
  });

  it('rgbToHsl pure blue', () => {
    expect(rgbToHsl({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 100, l: 50 });
  });

  it('round-trip red', () => {
    const back = rgbToHsl(hslToRgb({ h: 0, s: 100, l: 50 }));
    expect(back).toEqual({ h: 0, s: 100, l: 50 });
  });

  it('round-trip arbitrary color stable to nearest int', () => {
    const rgb = { r: 200, g: 100, b: 50 };
    const back = hslToRgb(rgbToHsl(rgb));
    expect(Math.abs(back.r - rgb.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.g - rgb.g)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(1);
  });

  it('rgbToHex pads 2 digits each', () => {
    expect(rgbToHex({ r: 1, g: 2, b: 3 })).toBe('#010203');
  });

  it('rgbToHex clamps', () => {
    expect(rgbToHex({ r: 300, g: -10, b: 128 })).toBe('#ff0080');
  });

  it('hexToRgb full form', () => {
    expect(hexToRgb('#ff8000')).toEqual({ r: 255, g: 128, b: 0 });
  });

  it('hexToRgb short form expands', () => {
    expect(hexToRgb('#f80')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('hexToRgb accepts no leading #', () => {
    expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('hexToRgb throws on invalid', () => {
    expect(() => hexToRgb('#zzz')).toThrow();
    expect(() => hexToRgb('not-a-hex')).toThrow();
  });

  it('hexToRgb throws on non-string', () => {
    expect(() => hexToRgb(123 as any)).toThrow();
  });

  it('hex round-trip', () => {
    const c = { r: 17, g: 34, b: 51 };
    expect(hexToRgb(rgbToHex(c))).toEqual(c);
  });
});
