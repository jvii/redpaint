import { Color } from '../../types';

// DPaint's actual default palettes per color depth (PRISM.C: default1..5),
// loaded at startup / on depth change. Values are 12-bit Amiga RGB (0xRGB,
// 4 bits per channel); amigaRgbToColor below scales each nibble to 8 bits.
const DPAINT_DEFAULTS: { [colors: number]: number[] } = {
  2: [0x000, 0xfff],
  4: [0x000, 0xfff, 0x55f, 0xf80],
  8: [0x000, 0xfff, 0xb00, 0x080, 0x24c, 0xeb0, 0xb52, 0x0cc],
  16: [
    0x000, 0xfff, 0xc00, 0xf60, 0x090, 0x3f1, 0x00f, 0x2cd,
    0xf0c, 0xa0f, 0x950, 0xfca, 0xfe0, 0xccc, 0x888, 0x444,
  ],
  32: [
    0x000, 0xfff, 0xe00, 0xa00, 0xd80, 0xfe0, 0x8f0, 0x080,
    0x0b6, 0x0dd, 0x0af, 0x07c, 0x00f, 0x70f, 0xc0e, 0xc08,
    0x620, 0xe52, 0xa52, 0xfca, 0x333, 0x444, 0x555, 0x666,
    0x777, 0x888, 0x999, 0xaaa, 0xbbb, 0xccc, 0xddd, 0xeee,
  ],
};

function amigaRgbToColor(rgb12: number): Color {
  const r = (rgb12 >> 8) & 0xf;
  const g = (rgb12 >> 4) & 0xf;
  const b = rgb12 & 0xf;
  return { r: r * 17, g: g * 17, b: b * 17 };
}

export function createPalette(
  colors: number
): {
  [id: string]: Color;
} {
  const palette: {
    [id: string]: Color;
  } = {};

  const dpaintDefault = DPAINT_DEFAULTS[colors];
  if (dpaintDefault) {
    dpaintDefault.forEach((rgb12, i) => {
      palette[i + 1] = amigaRgbToColor(rgb12);
    });
    return palette;
  }

  // Beyond DPaint's depths (64/128/256) there's no original to draw from:
  // start with the 32-color default and extend it with a grayscale ramp
  // followed by a hue sweep.
  DPAINT_DEFAULTS[32].forEach((rgb12, i) => {
    palette[i + 1] = amigaRgbToColor(rgb12);
  });
  const extra = colors - 32;
  const grayscales = Math.min(extra, 16);
  for (let i = 0; i < grayscales; i++) {
    palette[33 + i] = createGrayscaleColor(grayscales, i);
  }
  for (let i = grayscales; i < extra; i++) {
    palette[33 + i] = createHSLColor(extra - grayscales, i - grayscales);
  }

  return palette;
}

function createGrayscaleColor(range: number, value: number): Color {
  const percent = value / range;
  return {
    r: Math.round(percent * 255),
    g: Math.round(percent * 255),
    b: Math.round(percent * 255),
  };
}

function createHSLColor(range: number, value: number): Color {
  const minHue = 0;
  const maxHue = 360;
  const percent = value / range;
  const hue = percent * (maxHue - minHue) + minHue;
  return hslToColor(hue, 1, 0.5);
}

// expected hue range: [0, 360)
// expected saturation range: [0, 1]
// expected lightness range: [0, 1]
export function hslToColor(hue: number, saturation: number, lightness: number): Color {
  // based on algorithm from http://en.wikipedia.org/wiki/HSL_and_HSV#Converting_to_RGB

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  let huePrime = hue / 60;
  const secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));

  huePrime = Math.floor(huePrime);
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime === 0) {
    red = chroma;
    green = secondComponent;
    blue = 0;
  } else if (huePrime === 1) {
    red = secondComponent;
    green = chroma;
    blue = 0;
  } else if (huePrime === 2) {
    red = 0;
    green = chroma;
    blue = secondComponent;
  } else if (huePrime === 3) {
    red = 0;
    green = secondComponent;
    blue = chroma;
  } else if (huePrime === 4) {
    red = secondComponent;
    green = 0;
    blue = chroma;
  } else if (huePrime === 5) {
    red = chroma;
    green = 0;
    blue = secondComponent;
  }

  const lightnessAdjustment = lightness - chroma / 2;
  red += lightnessAdjustment;
  green += lightnessAdjustment;
  blue += lightnessAdjustment;

  return { r: Math.round(red * 255), g: Math.round(green * 255), b: Math.round(blue * 255) };
}

export function colorEquals(color1: Color, color2: Color): boolean {
  return color1.r === color2.r && color1.g === color2.g && color1.b === color2.b;
}
