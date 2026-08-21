import { Color } from '../../types';

// DPaint's actual default palettes per color depth. 2/4/8/16 are DPaint I's
// (PRISM.C: default1..4, the only source we have, exact, byte-for-byte). The
// 32-color entry is DPaint II's instead: DPaint II shipped a different
// default32 (confirmed by a user-provided screenshot of it, not just one
// changed swatch but a differently laid-out palette entirely, e.g. white sits
// at the end of the gray ramp rather than as the second color) and we have no
// DPaint II source to read exact values from, so this is sampled from that
// screenshot and snapped to the nearest 4-bit-per-channel Amiga primary,
// approximate, not byte-exact like the others. Values are 12-bit Amiga RGB
// (0xRGB, 4 bits per channel); amigaRgbToColor below scales each nibble to 8
// bits.
const DPAINT_DEFAULTS: { [colors: number]: number[] } = {
  2: [0x000, 0xfff],
  4: [0x000, 0xfff, 0x55f, 0xf80],
  8: [0x000, 0xfff, 0xb00, 0x080, 0x24c, 0xeb0, 0xb52, 0x0cc],
  16: [
    0x000, 0xfff, 0xc00, 0xf60, 0x090, 0x3f1, 0x00f, 0x2cd, 0xf0c, 0xa0f, 0x950, 0xfca, 0xfe0,
    0xccc, 0x888, 0x444,
  ],
  32: [
    0x000, 0xec9, 0xe00, 0x900, 0xd70, 0xfe0, 0x7f0, 0x070, 0x0b5, 0x0dd, 0x09f, 0x06c, 0x00f,
    0x60f, 0xc0e, 0xc07, 0x520, 0xe42, 0x942, 0xfc9, 0x444, 0x555, 0x666, 0x777, 0x888, 0x999,
    0xaaa, 0xbbb, 0xccc, 0xddd, 0xeee, 0xfff,
  ],
};

function amigaRgbToColor(rgb12: number): Color {
  const r = (rgb12 >> 8) & 0xf;
  const g = (rgb12 >> 4) & 0xf;
  const b = rgb12 & 0xf;
  return { r: r * 17, g: g * 17, b: b * 17 };
}

export function createPalette(colors: number): {
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

  // Beyond DPaint's depths (64/128/256) there is no original to draw from, so
  // its 32 lead and the rest is filled to cover the color cube evenly.
  //
  // Evenly matters more than it sounds. These slots exist to be *matched
  // against* — an image or a brush arriving in colors the palette does not
  // have is remapped to the nearest it does (remapColorsGreedy) — and a sweep
  // along any one line through the cube leaves most of it unreachable. A hue
  // sweep at full saturation and mid lightness was tried and is exactly that:
  // measured against a DPaint brush, 256 of those colors were barely better
  // than 32, because the brush is mostly dark and desaturated and the sweep
  // holds neither. A lattice halves the mean error and thirds the worst.
  // Added one at a time, skipping anything already there: n colors should be n
  // *usable* colors, and the lattice's own black, white and grays are DPaint's
  // too — thirteen of the 256 were repeats before this.
  let next = 1;
  const seen = new Set<number>();
  const add = (color: Color): void => {
    const key = (color.r << 16) | (color.g << 8) | color.b;
    if (next > colors || seen.has(key)) {
      return;
    }
    seen.add(key);
    palette[next++] = color;
  };

  DPAINT_DEFAULTS[32].forEach((rgb12): void => add(amigaRgbToColor(rgb12)));

  const [reds, greens, blues] = latticeDimensions(colors - 32);
  // Candidates for the slots after DPaint's, gathered before being placed so
  // they can be sorted. Skips anything already in the palette or already
  // offered, so the count below is a count of colors that will actually land.
  const fill: Color[] = [];
  const offered = new Set<number>();
  const offer = (color: Color): void => {
    const key = (color.r << 16) | (color.g << 8) | color.b;
    if (!seen.has(key) && !offered.has(key)) {
      offered.add(key);
      fill.push(color);
    }
  };
  for (let r = 0; r < reds; r++) {
    for (let g = 0; g < greens; g++) {
      for (let b = 0; b < blues; b++) {
        offer({
          r: Math.round((r * 255) / (reds - 1)),
          g: Math.round((g * 255) / (greens - 1)),
          b: Math.round((b * 255) / (blues - 1)),
        });
      }
    }
  }

  // A lattice rarely divides the slots exactly, and skipping repeats frees a
  // few more. Both go to grays, where an eye notices banding first. Each pass
  // halves the spacing, so the ones that land between existing grays are the
  // ones that get added.
  const wanted = colors - 32;
  for (let levels = Math.max(2, wanted - fill.length); fill.length < wanted && levels <= 256; ) {
    for (let i = 0; i < levels && fill.length < wanted; i++) {
      offer(createGrayscaleColor(levels - 1, i));
    }
    levels *= 2;
  }

  // Sorted before they are laid down, purely so the grid can be read. The set
  // is the same either way and so is every remap against it — but generated in
  // lattice order the swatches are a wall of noise, blue stepping fastest
  // against a grid eight wide.
  //
  // Grays first, continuing the ramp DPaint's own 32 end on. Then bands a
  // twelfth of the wheel wide, each ramping dark to light. Sorting by hue
  // itself was tried first and is barely better than not sorting: a lattice
  // gives almost every color its own hue to a fraction of a degree, so the
  // lightness never gets to break a tie and each band comes out mottled.
  // Wider bands were tried too and read muddy, a whole band being more than
  // one recognizable color.
  fill.sort((a, b): number => {
    const x = hslOf(a);
    const y = hslOf(b);
    if (x.gray !== y.gray) {
      return x.gray ? -1 : 1;
    }
    if (x.gray) {
      return x.lightness - y.lightness;
    }
    return (
      Math.floor(x.hue / HUE_BAND) - Math.floor(y.hue / HUE_BAND) ||
      x.lightness - y.lightness ||
      x.saturation - y.saturation
    );
  });
  fill.forEach(add);

  return palette;
}

// How wide a band of hue reads as one color. A twelfth of the wheel: red,
// orange, yellow and so on each get their own.
const HUE_BAND = 30;

// Enough of HSL to order swatches by: which are gray, and where the rest sit
// around the wheel, up the lightness scale and out from it.
function hslOf(color: Color): {
  gray: boolean;
  hue: number;
  lightness: number;
  saturation: number;
} {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lightness = (max + min) / 2;
  if (chroma === 0) {
    return { gray: true, hue: 0, lightness, saturation: 0 };
  }
  const sixth =
    max === r ? ((g - b) / chroma) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
  return {
    gray: false,
    hue: (sixth * 60 + 360) % 360,
    lightness,
    saturation: chroma / (1 - Math.abs(2 * lightness - 1)),
  };
}

// The most even RGB lattice that fits in `slots`. Even is measured as the
// diagonal of one cell, which is what bounds how far any color can be from the
// nearest lattice point — so this maximizes the count only where doing so does
// not stretch one channel. 6x6x6 beats 7x8x4 for 224 slots on that measure,
// and by measurement against a real brush.
//
// Ties go to the channel with the most green levels, which the eye resolves
// best. Nothing here is tuned to a particular picture.
function latticeDimensions(slots: number): [number, number, number] {
  let best: [number, number, number] = [2, 2, 2];
  let bestDiagonal = Infinity;
  const step = (levels: number): number => 255 / (levels - 1);
  for (let r = 2; r <= 16; r++) {
    for (let g = 2; g <= 16; g++) {
      for (let b = 2; b <= 16; b++) {
        if (r * g * b > slots) {
          continue;
        }
        const diagonal = Math.hypot(step(r), step(g), step(b));
        if (diagonal < bestDiagonal - 1e-9 || (diagonal < bestDiagonal + 1e-9 && g > best[1])) {
          bestDiagonal = diagonal;
          best = [r, g, b];
        }
      }
    }
  }
  return best;
}

function createGrayscaleColor(range: number, value: number): Color {
  const percent = value / range;
  return {
    r: Math.round(percent * 255),
    g: Math.round(percent * 255),
    b: Math.round(percent * 255),
  };
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
