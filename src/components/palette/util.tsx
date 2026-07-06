import { Color } from '../../types';

// DPaint's actual default 32-color palette (PRISM.C: default5), loaded at
// startup for 32-color/HAM depth. Values are 12-bit Amiga RGB (0xRGB, 4 bits
// per channel); amigaRgbToColor below scales each nibble to 8 bits.
const DPAINT_DEFAULT_32: number[] = [
  0x000, 0xfff, 0xe00, 0xa00, 0xd80, 0xfe0, 0x8f0, 0x080,
  0x0b6, 0x0dd, 0x0af, 0x07c, 0x00f, 0x70f, 0xc0e, 0xc08,
  0x620, 0xe52, 0xa52, 0xfca, 0x333, 0x444, 0x555, 0x666,
  0x777, 0x888, 0x999, 0xaaa, 0xbbb, 0xccc, 0xddd, 0xeee,
];

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

  if (colors === DPAINT_DEFAULT_32.length) {
    DPAINT_DEFAULT_32.forEach((rgb12, i) => {
      palette[i + 1] = amigaRgbToColor(rgb12);
    });
    return palette;
  }

  // Fallback for any other palette size (e.g. a future larger cap): a
  // grayscale ramp followed by a hue sweep, since there's no DPaint original
  // to draw from beyond 32 colors.
  const grayscales = 10;

  for (let i = 0; i < grayscales; i++) {
    const color = createGrayscaleColor(grayscales, i);
    palette[i + 1] = color;
  }

  for (let i = grayscales; i < colors; i++) {
    const color = createHSLColor(colors - grayscales, i - grayscales);
    palette[i + 1] = color;
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
