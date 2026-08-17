// Turning an outline font into 1-bit text.
//
// No browser exposes an aliased text path: canvas anti-aliases in coverage, so
// the edge pixel's alpha says how much of the glyph covered it whatever color
// was asked for, and neither imageSmoothingEnabled (that governs image scaling)
// nor the CSS font-smoothing properties (they don't reach fillText) change it.
//
// So the browser is used only as an outline rasterizer, at a size where its own
// anti-aliasing no longer biases the shape, and the pixels are decided here:
// draw at SUPERSAMPLE times the wanted size, then set an output pixel when at
// least half of its SUPERSAMPLE x SUPERSAMPLE subsamples were covered. That is
// area coverage, the rule an aliased rasterizer would apply. Thresholding a 1x
// render instead would inherit both the browser's anti-aliasing and its lack of
// hinting.
//
// A whole line is drawn in one fillText rather than assembled from separately
// rasterized glyphs. Per-glyph assembly has to round each advance to a whole
// pixel before adding it up, and being a half pixel out on every gap in turn is
// plainly visible as uneven rhythm even though the total width comes out right.
// One fillText lets the browser place the glyphs at its own sub-pixel
// precision, and only the finished line is reduced to pixels.
//
// The size is in canvas pixels, and a screen format's pixel aspect is
// deliberately not folded into it: text in Med-Res displays half as wide, the
// way everything else drawn here does. DPaint's own text never consulted the
// screen mode (TEXT.C's mDispChar is a 1:1 blit, and `aspect` appears in that
// source only in the ILBM header code), and no tool in this app does either —
// a circle drawn in Med-Res is a pixel-circle that displays as an ellipse.
// PyDPainter does correct for it, but only because it swapped the bitmap font
// for a scalable one and so had to choose a ppem.
//
// Below roughly 12px this stops being enough: outlines that small have
// sub-pixel stem widths and canvas grid-fits nothing, so stems thin and break
// no matter how finely they are sampled. That is missing information, not a
// sampling error, and it is why a real bitmap font still has a place.

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

// Subsamples per axis. 4 gives each output pixel 16 coverage levels, which is
// finer than the difference between any two plausible fill rules; 8 was
// measured as visually identical and seven times slower.
//
// Three other ways to sharpen the result were measured and are not worth
// retrying:
//   - Choosing the sub-pixel baseline phase that best fits the outline to the
//     grid, as a stand-in for the hinting skipped below. Best case was 0.6%
//     fewer undecided pixels at 12px, and at 16px phase 0 already won.
//   - Counting each subsample as covered/not before summing, to be immune to
//     any gamma in the browser's text alpha. Indistinguishable, which says the
//     alpha is near enough to linear coverage to ignore.
//   - Moving the threshold. Swept 0.35 to 0.60 at 11px: below 0.45 counters
//     close up, above 0.50 bowls break, and half is already the value the rule
//     asks for.
const SUPERSAMPLE = 4;

// One column of clearance on each side of the line, for glyphs whose ink
// reaches past the pen (an italic's lean, a 'j' hooking left).
const MARGIN = 1;

export function cssFont(spec: FontSpec, sizePx: number): string {
  const style = spec.italic ? 'italic ' : '';
  const weight = spec.bold ? 'bold ' : '';
  return `${style}${weight}${sizePx}px ${spec.family}`;
}

// One canvas, reused. Rasterizing happens on every keystroke, and allocating a
// fresh canvas each time leaves the collector to reclaim them.
let scratch: HTMLCanvasElement | null = null;

function scratchContext(spec: FontSpec): CanvasRenderingContext2D {
  if (!scratch) {
    scratch = document.createElement('canvas');
  }
  // alpha: true deliberately. An opaque context can get subpixel (LCD)
  // anti-aliasing in some browsers, whose colored fringes would corrupt the
  // coverage reading that the whole approach rests on. willReadFrequently asks
  // for a software backing store, which is what getImageData wants.
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

// Whole pixels from the start of a line to the pen after `text`. Rounded once,
// at the end, so it is the advance the rasterized line actually has.
export function measureAdvance(spec: FontSpec, text: string): number {
  if (text === '') {
    return 0;
  }
  return Math.round(scratchContext(spec).measureText(text).width / SUPERSAMPLE);
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

export function rasterizeRun(spec: FontSpec, text: string): TextRun {
  if (text === '') {
    return emptyRun(spec);
  }

  const measured = scratchContext(spec).measureText(text);
  // Sized to the ink, not to the line box: a run of "acorn" needs no room for
  // an ascender, and the baseline recorded below is what puts it back in the
  // right place regardless.
  const left = Math.max(0, Math.ceil(measured.actualBoundingBoxLeft / SUPERSAMPLE));
  const right = Math.ceil(
    Math.max(measured.actualBoundingBoxRight, measured.width) / SUPERSAMPLE
  );
  const ascent = Math.ceil(measured.actualBoundingBoxAscent / SUPERSAMPLE);
  const descent = Math.ceil(measured.actualBoundingBoxDescent / SUPERSAMPLE);

  const originX = left + MARGIN;
  const width = originX + right + MARGIN;
  const height = ascent + descent;
  if (width <= 0 || height <= 0) {
    // All-whitespace: it advances the pen but marks nothing.
    return { ...emptyRun(spec), originX, width };
  }

  const canvas = scratch as HTMLCanvasElement;
  canvas.width = width * SUPERSAMPLE;
  canvas.height = height * SUPERSAMPLE;
  // Sizing the canvas resets the context, so the font has to be set again after
  // it rather than once alongside the measuring above.
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

// Reduces the supersampled render to 1-bit pixels: an output pixel is set when
// at least half of its subsamples were covered.
//
// Exported for testing, which is why it takes raw RGBA rather than the canvas:
// the rasterizing pass above needs a browser that actually draws text, this
// does not.
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
