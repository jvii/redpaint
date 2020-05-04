import { Color } from '../../types';

export function createPalette(
  colors: number
): {
  [id: string]: Color;
} {
  const palette: {
    [id: string]: Color;
  } = {};

  const grayscales = 10;

  for (let i = 0; i < grayscales; i++) {
    const color = createGrayscaleColor(grayscales, i);
    palette[i] = color;
  }

  for (let i = grayscales; i < colors; i++) {
    const color = createHSLColor(colors - grayscales, i - grayscales);
    palette[i] = color;
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
