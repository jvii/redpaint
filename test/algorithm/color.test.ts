import { describe, expect, test } from 'vitest';
import { colorToRGBString, hsvToRgb, rgbToHsv } from '../../src/algorithm/color';

describe('rgbToHsv', () => {
  test('primaries land on their hue, full saturation and value', () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, v: 100 });
    expect(rgbToHsv({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, v: 100 });
    expect(rgbToHsv({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 100, v: 100 });
  });

  test('greys have no hue and no saturation', () => {
    expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 });
    expect(rgbToHsv({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, v: 100 });
    expect(rgbToHsv({ r: 128, g: 128, b: 128 })).toEqual({ h: 0, s: 0, v: 50 });
  });

  // the red branch computes a negative hue for a blue-dominant secondary and
  // wraps it, which is the one place the hue can leave 0..359
  test('wraps the negative hue the magenta branch produces', () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 255 })).toEqual({ h: 300, s: 100, v: 100 });
    expect(rgbToHsv({ r: 255, g: 0, b: 128 }).h).toBe(330);
  });
});

describe('hsvToRgb', () => {
  test('inverts the primaries', () => {
    expect(hsvToRgb({ h: 0, s: 100, v: 100 })).toEqual({ r: 255, g: 0, b: 0 });
    expect(hsvToRgb({ h: 120, s: 100, v: 100 })).toEqual({ r: 0, g: 255, b: 0 });
    expect(hsvToRgb({ h: 240, s: 100, v: 100 })).toEqual({ r: 0, g: 0, b: 255 });
  });

  test('zero saturation is grey at the value, whatever the hue', () => {
    expect(hsvToRgb({ h: 0, s: 0, v: 100 })).toEqual({ r: 255, g: 255, b: 255 });
    expect(hsvToRgb({ h: 200, s: 0, v: 50 })).toEqual({ r: 128, g: 128, b: 128 });
  });

  // h === 360 would fall past the last branch if the code keyed on h < 6
  // exclusively; the final else has to catch it
  test('treats hue 360 as hue 0', () => {
    expect(hsvToRgb({ h: 360, s: 100, v: 100 })).toEqual({ r: 255, g: 0, b: 0 });
  });
});

describe('round trip', () => {
  // Spread (overmind/palette/actions.ts) interpolates in HSV and converts
  // back, so a color that survives the round trip is the baseline it relies
  // on. The conversions round to integer h/s/v, so allow a small drift.
  test('recovers saturated colors within rounding', () => {
    const samples = [
      { r: 255, g: 136, b: 0 }, // Workbench orange
      { r: 0, g: 85, b: 170 }, // Workbench blue
      { r: 17, g: 200, b: 90 },
      { r: 250, g: 250, b: 3 },
      { r: 60, g: 0, b: 130 },
    ];
    for (const color of samples) {
      const back = hsvToRgb(rgbToHsv(color));
      expect(Math.abs(back.r - color.r)).toBeLessThanOrEqual(3);
      expect(Math.abs(back.g - color.g)).toBeLessThanOrEqual(3);
      expect(Math.abs(back.b - color.b)).toBeLessThanOrEqual(3);
    }
  });
});

describe('colorToRGBString', () => {
  test('formats a CSS rgb() color', () => {
    expect(colorToRGBString({ r: 1, g: 2, b: 3 })).toBe('rgb(1,2,3)');
  });
});
