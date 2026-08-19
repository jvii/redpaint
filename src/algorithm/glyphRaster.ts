// Turning an outline font into 1-bit text: the browser rasterizes the outline
// at SUPERSAMPLE x the wanted size, and coverage decides the pixels here. See
// docs/text-tool.md.

export type FontSpec = {
  family: string;
  size: number; // px, the em size the text is rasterized for
  bold: boolean;
  italic: boolean;
};

// A rasterized line. Rows run top-down, `bits` holds one byte per pixel (0 or
// 1), and the two origins locate the pen within it: the caller places the
// bitmap so that (originX, baseline) lands on the text's start point.
export type TextRun = {
  width: number;
  height: number;
  bits: Uint8Array;
  originX: number;
  baseline: number;
};

// The font's own line box, which does not change with what has been typed —
// unlike a run's height, which is tight around the glyphs actually in it.
export type FontMetrics = {
  lineHeight: number;
  ascent: number;
  descent: number;
};

// 8 was measured as visually identical and seven times slower.
const SUPERSAMPLE = 4;

// One column of clearance on each side of the line, for glyphs whose ink
// reaches past the pen (an italic's lean, a 'j' hooking left).
const MARGIN = 1;

// Not optional: an unquoted family name must be a sequence of valid CSS
// identifiers, so "Press Start 2P" fails to parse and ctx.font silently keeps
// the font it had.
export function quoteFamily(family: string): string {
  return `"${family.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function cssFont(spec: FontSpec, sizePx: number): string {
  const style = spec.italic ? 'italic ' : '';
  const weight = spec.bold ? 'bold ' : '';
  return `${style}${weight}${sizePx}px ${quoteFamily(spec.family)}`;
}

// One canvas, reused. Rasterizing happens on every keystroke, and allocating a
// fresh canvas each time leaves the collector to reclaim them.
let scratch: HTMLCanvasElement | null = null;

function scratchContext(spec: FontSpec): CanvasRenderingContext2D {
  if (!scratch) {
    scratch = document.createElement('canvas');
  }
  // alpha: true deliberately — an opaque context can get subpixel (LCD)
  // anti-aliasing, whose colored fringes would corrupt the coverage reading.
  const ctx = scratch.getContext('2d', { alpha: true, willReadFrequently: true });
  if (!ctx) {
    throw new Error('No 2d context available for glyph rasterization');
  }
  ctx.font = cssFont(spec, spec.size * SUPERSAMPLE);
  ctx.textBaseline = 'alphabetic';
  return ctx;
}

export function fontMetrics(spec: FontSpec): FontMetrics {
  const m = scratchContext(spec).measureText('Hxy');
  const ascent = Math.ceil(m.fontBoundingBoxAscent / SUPERSAMPLE);
  const descent = Math.ceil(m.fontBoundingBoxDescent / SUPERSAMPLE);
  return { lineHeight: ascent + descent, ascent, descent };
}

// A glyph drawn alone always meets the pixel grid at the same phase, so it
// always comes out the same pixels.
const glyphCache = new Map<string, TextRun>();
// Unrounded: rounding advances individually is what makes a line drift short.
const advanceCache = new Map<string, number>();

function glyphKey(spec: FontSpec, character: string): string {
  return `${cssFont(spec, spec.size)}|${character}`;
}

function glyphCell(spec: FontSpec, character: string): TextRun {
  const key = glyphKey(spec, character);
  const cached = glyphCache.get(key);
  if (cached) {
    return cached;
  }
  const cell = rasterizeAlone(spec, character);
  glyphCache.set(key, cell);
  return cell;
}

function glyphAdvance(spec: FontSpec, character: string): number {
  const key = glyphKey(spec, character);
  const cached = advanceCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const advance = scratchContext(spec).measureText(character).width / SUPERSAMPLE;
  advanceCache.set(key, advance);
  return advance;
}

// Where each glyph sits, in whole pixels from the pen. The pen stays
// fractional and only its position is rounded, so the line tracks the font's
// metrics instead of drifting. `tracking` widens every advance, which the
// outline style needs. See docs/text-tool.md.
function layOut(spec: FontSpec, text: string, tracking: number): { x: number; cell: TextRun }[] {
  const placed: { x: number; cell: TextRun }[] = [];
  let pen = 0;
  for (const character of text) {
    placed.push({ x: Math.round(pen), cell: glyphCell(spec, character) });
    pen += glyphAdvance(spec, character) + tracking;
  }
  return placed;
}

// The same rounding rule layOut uses, so the caret lands where the next glyph
// will.
export function measureAdvance(spec: FontSpec, text: string, tracking = 0): number {
  let pen = 0;
  for (const character of text) {
    pen += glyphAdvance(spec, character) + tracking;
  }
  return Math.round(pen);
}

function emptyRun(spec: FontSpec): TextRun {
  const metrics = fontMetrics(spec);
  return {
    width: 0,
    height: 0,
    bits: new Uint8Array(0),
    originX: 0,
    baseline: metrics.ascent,
  };
}

// The only place fillText is called, and the pen is a whole pixel here by
// construction.
function rasterizeAlone(spec: FontSpec, text: string): TextRun {
  const measured = scratchContext(spec).measureText(text);
  // Sized to the ink, not the line box; the baseline recorded below is what
  // puts it back in place.
  const left = Math.max(0, Math.ceil(measured.actualBoundingBoxLeft / SUPERSAMPLE));
  const right = Math.ceil(Math.max(measured.actualBoundingBoxRight, measured.width) / SUPERSAMPLE);
  const ascent = Math.ceil(measured.actualBoundingBoxAscent / SUPERSAMPLE);
  const descent = Math.ceil(measured.actualBoundingBoxDescent / SUPERSAMPLE);

  const originX = left + MARGIN;
  const width = originX + right + MARGIN;
  const height = ascent + descent;
  if (width <= 0 || height <= 0) {
    // Whitespace: it advances the pen but marks nothing.
    return { ...emptyRun(spec), originX, width };
  }

  const canvas = scratch as HTMLCanvasElement;
  canvas.width = width * SUPERSAMPLE;
  canvas.height = height * SUPERSAMPLE;
  // Sizing the canvas resets the context, so the font is set again after it.
  const ctx = scratchContext(spec);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, originX * SUPERSAMPLE, ascent * SUPERSAMPLE);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return {
    width,
    height,
    bits: thresholdCoverage(image.data, canvas.width, width, height),
    originX,
    baseline: ascent,
  };
}

// A line: its glyphs blitted at whole-pixel pen positions.
export function rasterizeRun(spec: FontSpec, text: string, tracking = 0): TextRun {
  if (text === '') {
    return emptyRun(spec);
  }
  const placed = layOut(spec, text, tracking);
  const advance = measureAdvance(spec, text, tracking);

  // Relative to the first glyph's pen, at 0. A glyph can reach left of its own
  // pen (an italic's lean) and the last past the final advance.
  let minX = 0;
  let maxX = advance;
  let ascent = 0;
  let descent = 0;
  for (const { x, cell } of placed) {
    if (cell.width === 0 || cell.height === 0) {
      continue;
    }
    minX = Math.min(minX, x - cell.originX);
    maxX = Math.max(maxX, x - cell.originX + cell.width);
    ascent = Math.max(ascent, cell.baseline);
    descent = Math.max(descent, cell.height - cell.baseline);
  }

  const originX = -minX + MARGIN;
  const width = originX + maxX + MARGIN;
  const height = ascent + descent;
  if (height === 0) {
    // All whitespace.
    return { ...emptyRun(spec), originX, width };
  }

  const bits = new Uint8Array(width * height);
  for (const { x, cell } of placed) {
    if (cell.width === 0 || cell.height === 0) {
      continue;
    }
    const left = originX + x - cell.originX;
    const top = ascent - cell.baseline;
    for (let y = 0; y < cell.height; y++) {
      const source = y * cell.width;
      const target = (top + y) * width + left;
      for (let cx = 0; cx < cell.width; cx++) {
        // OR, not copy: glyphs overlap wherever one overhangs its advance.
        if (cell.bits[source + cx]) {
          bits[target + cx] = 1;
        }
      }
    }
  }

  return { width, height, bits, originX, baseline: ascent };
}

// An output pixel is set when at least half its subsamples were covered.
// Takes raw RGBA rather than the canvas so it can be tested without one.
export function thresholdCoverage(
  data: Uint8ClampedArray,
  imageWidth: number,
  width: number,
  height: number
): Uint8Array {
  const bits = new Uint8Array(width * height);
  // Half the area, compared without halving: a pixel whose subsamples are half
  // fully-covered averages alpha 127.5, so testing against 128 would quietly
  // reject the exact halfway case and thin every stem by a hair.
  const halfCovered = SUPERSAMPLE * SUPERSAMPLE * 255;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let coverage = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        let sample = ((y * SUPERSAMPLE + sy) * imageWidth + x * SUPERSAMPLE) * 4 + 3;
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          coverage += data[sample];
          sample += 4;
        }
      }
      if (coverage * 2 >= halfCovered) {
        bits[y * width + x] = 1;
      }
    }
  }
  return bits;
}
