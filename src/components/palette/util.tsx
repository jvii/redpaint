import { Color } from '../../types';
import { hsvToRgb } from '../../algorithm/color';

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
  // its 32 lead and the rest is filled with ramps: runs of one hue from dark to
  // light, each exactly RAMP_LENGTH long and each starting a fresh row of the
  // palette grid, which is eight wide above 64 colors (Palette.tsx).
  //
  // Ramps rather than an even lattice because these slots are painted with as
  // well as matched against. A range is what cycling animates, what a gradient
  // fill walks and what shading a shape needs, and none of that can be done
  // with colors that are merely near each other in the palette. It is also what
  // a real DPaint palette looks like: the Dolphin brush that prompted this
  // carries a hand-built sunset ramp and a gray one in its last twelve slots.
  //
  // It costs accuracy when an outside picture is remapped in — measured against
  // that brush, mean error 11.5 against a lattice's 8.8, worst 48 against 24 —
  // because ramps are spokes and an arbitrary color can land between them.
  // Whichever is wanted, the palette is per-document and can be replaced.
  // Placed one at a time, skipping anything already there: n colors should be
  // n *usable* colors.
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

  const ramps = Math.floor((colors - 32) / RAMP_LENGTH);
  // Two tiers of saturation once there are hues enough to spare for it: a
  // vivid set and a muted one, which is what most pictures actually need.
  const saturations = ramps >= 8 ? [1, 0.5] : [1];
  const hues = Math.ceil(ramps / saturations.length);
  for (const saturation of saturations) {
    for (let hue = 0; hue < hues; hue++) {
      for (let step = 0; step < RAMP_LENGTH; step++) {
        add(rampColor((hue * 360) / hues, saturation, step, seen));
      }
    }
  }

  // What the ramps left: slots freed where a ramp would have repeated a color,
  // and whatever does not divide into RAMP_LENGTH. Filled with the colors the
  // ramps sit furthest from, so the gaps between spokes are the ones covered.
  const [reds, greens, blues] = latticeDimensions(216);
  const candidates: Color[] = [];
  for (let r = 0; r < reds; r++) {
    for (let g = 0; g < greens; g++) {
      for (let b = 0; b < blues; b++) {
        candidates.push({
          r: Math.round((r * 255) / (reds - 1)),
          g: Math.round((g * 255) / (greens - 1)),
          b: Math.round((b * 255) / (blues - 1)),
        });
      }
    }
  }
  while (next <= colors) {
    const placed = Object.values(palette);
    let furthest: Color | null = null;
    let furthestDistance = -1;
    for (const candidate of candidates) {
      if (seen.has((candidate.r << 16) | (candidate.g << 8) | candidate.b)) {
        continue;
      }
      let nearest = Infinity;
      for (const color of placed) {
        const distance =
          (candidate.r - color.r) ** 2 +
          (candidate.g - color.g) ** 2 +
          (candidate.b - color.b) ** 2;
        if (distance < nearest) {
          nearest = distance;
        }
      }
      if (nearest > furthestDistance) {
        furthestDistance = nearest;
        furthest = candidate;
      }
    }
    if (!furthest) {
      break;
    }
    add(furthest);
  }

  return palette;
}

// How long one ramp is, and so how many slots a row of the palette grid holds
// above 64 colors. Eight, so a ramp is exactly a row and can be read as one.
const RAMP_LENGTH = 8;

// One step of a ramp: the hue at a value climbing from dark to light, on the
// 4-bit channels every Amiga palette uses.
//
// Nudged within its own step when it would repeat a color already placed —
// different hues collapse onto the same dark color once rounded to 4 bits, and
// without this a 256-color palette comes out with only 239 distinct colors in
// it. The nudge stays inside the step's own share of the value range, so a
// ramp still climbs.
function rampColor(hue: number, saturation: number, step: number, seen: Set<number>): Color {
  const band = 100 / RAMP_LENGTH;
  const base = (step + 1) * band;
  for (let nudge = 0; nudge <= 5; nudge++) {
    for (const direction of [-1, 1]) {
      const value = base + direction * nudge * (band / 6);
      const color = amigaQuantized(hsvToRgb({ h: hue, s: saturation * 100, v: value }));
      if (!seen.has((color.r << 16) | (color.g << 8) | color.b)) {
        return color;
      }
    }
  }
  return amigaQuantized(hsvToRgb({ h: hue, s: saturation * 100, v: base }));
}

// Every DPaint palette is 4 bits per channel; a ramp built off that grid would
// have steps the format cannot hold.
function amigaQuantized(color: Color): Color {
  return {
    r: Math.round(color.r / 17) * 17,
    g: Math.round(color.g / 17) * 17,
    b: Math.round(color.b / 17) * 17,
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
