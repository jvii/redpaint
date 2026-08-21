import { FontSpec, SUPERSAMPLE, cssFont, quoteFamily } from '../../algorithm/glyphRaster';
import { textRun } from '../../domain/PixelFont';
import { loadBundledFaces } from '../../domain/BundledFonts';

// Dumps what the text tool's rasterizer makes of a few glyphs, for comparing
// one machine against another. Run from the devtools console and paste the
// output:
//
//   await __redpaintGlyphDump()
//   await __redpaintGlyphDump(['Arial', 'Verdana'], [16, 24], 'gHe')
//
// The bundled faces are the control: their bytes are the same everywhere, so a
// difference in their grids is the platform's rasterizer and nothing else.
//
// `coverage` is the histogram of per-pixel supersample coverage before the
// 50% threshold is applied. The band either side of the threshold is what
// decides whether a pixel survives, so two machines that disagree about a
// glyph will disagree about that band first — a rasterizer with a different
// gamma or hinting puts a different number of pixels there.
const DEFAULT_FAMILIES = ['Press Start 2P', 'Silkscreen', 'Arial'];
const DEFAULT_SIZES = [16, 24];
const DEFAULT_GLYPHS = 'gH';

async function glyphDump(
  families: string[] = DEFAULT_FAMILIES,
  sizes: number[] = DEFAULT_SIZES,
  glyphs: string = DEFAULT_GLYPHS
): Promise<string> {
  await loadBundledFaces();
  await document.fonts.ready;

  const lines: string[] = [
    '=== redpaint glyph dump ===',
    `ua: ${navigator.userAgent}`,
    `dpr: ${window.devicePixelRatio}`,
  ];

  for (const family of families) {
    for (const size of sizes) {
      for (const glyph of glyphs) {
        const spec: FontSpec = { family, size, bold: false, italic: false };
        lines.push('', `--- ${family} ${size}px '${glyph}' ---`);
        const run = textRun(spec, glyph);
        lines.push(`grid ${run.width}x${run.height} baseline ${run.baseline}`);
        for (let y = 0; y < run.height; y++) {
          let row = '';
          for (let x = 0; x < run.width; x++) {
            row += run.bits[y * run.width + x] ? '#' : '.';
          }
          lines.push(row);
        }
        lines.push(coverageHistogram(spec, glyph));
      }
    }
  }

  const text = lines.join('\n');
  console.log(text);
  return text;
}

// Re-renders the glyph supersampled and buckets each output pixel's mean
// coverage. Deliberately its own render rather than a hook into the rasterizer:
// the caches there hand back a finished bitmap, and the raw alpha is the whole
// point of this.
function coverageHistogram(spec: FontSpec, glyph: string): string {
  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
  if (!measure) {
    return 'coverage: (no 2d context)';
  }
  measure.font = cssFont(spec, spec.size * SUPERSAMPLE);
  measure.textBaseline = 'alphabetic';
  const m = measure.measureText(glyph);
  const width = Math.ceil(Math.max(m.actualBoundingBoxRight, m.width) / SUPERSAMPLE) + 2;
  const height =
    Math.ceil(m.actualBoundingBoxAscent / SUPERSAMPLE) +
    Math.ceil(m.actualBoundingBoxDescent / SUPERSAMPLE) +
    1;

  canvas.width = width * SUPERSAMPLE;
  canvas.height = height * SUPERSAMPLE;
  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
  if (!ctx) {
    return 'coverage: (no 2d context)';
  }
  ctx.font = cssFont(spec, spec.size * SUPERSAMPLE);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  ctx.fillText(glyph, SUPERSAMPLE, Math.ceil(m.actualBoundingBoxAscent));

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = [0, 0, 0, 0, 0, 0];
  let undecided = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const px = (y * SUPERSAMPLE + sy) * canvas.width + (x * SUPERSAMPLE + sx);
          sum += data[px * 4 + 3];
        }
      }
      const coverage = sum / (255 * SUPERSAMPLE * SUPERSAMPLE);
      if (coverage >= 0.45 && coverage <= 0.55) {
        undecided++;
      }
      buckets[
        coverage === 0
          ? 0
          : coverage < 0.25
            ? 1
            : coverage < 0.45
              ? 2
              : coverage < 0.55
                ? 3
                : coverage < 0.75
                  ? 4
                  : 5
      ]++;
    }
  }
  return (
    `coverage: none ${buckets[0]}  <25% ${buckets[1]}  25-45% ${buckets[2]}  ` +
    `45-55% ${buckets[3]}  55-75% ${buckets[4]}  >75% ${buckets[5]}  ` +
    `| undecided ${undecided}  | font ${quoteFamily(spec.family)}`
  );
}

declare global {
  interface Window {
    __redpaintGlyphDump: typeof glyphDump;
  }
}

window.__redpaintGlyphDump = glyphDump;
