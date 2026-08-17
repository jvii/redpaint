import { FontMetrics, TextRun } from '../algorithm/glyphRaster';

// Fonts that are already pixels.
//
// The outline rasterizer (algorithm/glyphRaster.ts) has a floor: below roughly
// 12px an outline's stems are narrower than a pixel and canvas grid-fits
// nothing, so they thin and break however finely they are sampled. That is
// missing information, not a sampling error. A face drawn as pixels never had
// the information to lose, which is the whole reason to carry one.
//
// Sizes come from whole-number scaling only. A bitmap font has exactly one
// size; anything else is a resampling, and resampling a pixel face to a
// fractional size is how it stops being one.

// Parsed .rpbf (see tools/buildBitmapFont.mjs for the container). v1 is
// monospaced: the advance is the cell width.
export type BitmapFont = {
  id: string;
  cellWidth: number;
  cellHeight: number;
  baseline: number;
  firstCode: number;
  glyphCount: number;
  // glyphCount * cellHeight bytes, one byte per row, high bit leftmost
  rows: Uint8Array;
};

const MAGIC = 'RPBF';
const HEADER_BYTES = 12;

export function parseBitmapFont(id: string, buffer: ArrayBuffer): BitmapFont {
  const bytes = new Uint8Array(buffer);
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== MAGIC) {
    throw new Error(`${id}: not a bitmap font asset`);
  }
  const view = new DataView(buffer);
  const version = view.getUint8(4);
  if (version !== 1) {
    throw new Error(`${id}: unsupported bitmap font version ${version}`);
  }
  const cellWidth = view.getUint8(5);
  const cellHeight = view.getUint8(6);
  const baseline = view.getUint8(7);
  const firstCode = view.getUint16(8, true);
  const glyphCount = view.getUint16(10, true);

  const expected = HEADER_BYTES + glyphCount * cellHeight;
  if (bytes.length < expected) {
    throw new Error(`${id}: truncated bitmap font (${bytes.length} of ${expected} bytes)`);
  }
  return {
    id,
    cellWidth,
    cellHeight,
    baseline,
    firstCode,
    glyphCount,
    rows: bytes.subarray(HEADER_BYTES, expected),
  };
}

// Everything outside the face's range draws as a space, the same fallback the
// outline path uses for a character it has no glyph for.
function glyphIndex(font: BitmapFont, character: string): number {
  const index = character.charCodeAt(0) - font.firstCode;
  return index >= 0 && index < font.glyphCount ? index : 0;
}

export function bitmapMetrics(font: BitmapFont, scale: number): FontMetrics {
  return {
    lineHeight: font.cellHeight * scale,
    ascent: font.baseline * scale,
    descent: (font.cellHeight - font.baseline) * scale,
  };
}

export function bitmapAdvance(font: BitmapFont, scale: number, text: string): number {
  return text.length * font.cellWidth * scale;
}

// Lays a string out into the same TextRun the outline rasterizer produces, so
// nothing downstream knows which kind of face it got.
export function bitmapRun(font: BitmapFont, scale: number, text: string): TextRun {
  const width = bitmapAdvance(font, scale, text);
  const height = font.cellHeight * scale;
  if (width === 0 || height === 0) {
    return { width: 0, height: 0, bits: new Uint8Array(0), originX: 0, baseline: font.baseline * scale };
  }

  const bits = new Uint8Array(width * height);
  for (let i = 0; i < text.length; i++) {
    const glyph = glyphIndex(font, text.charAt(i));
    const originX = i * font.cellWidth * scale;
    for (let y = 0; y < font.cellHeight; y++) {
      const row = font.rows[glyph * font.cellHeight + y];
      if (row === 0) {
        continue;
      }
      for (let x = 0; x < font.cellWidth; x++) {
        if ((row & (0x80 >> x)) === 0) {
          continue;
        }
        // One source pixel becomes a scale x scale block: whole pixels only,
        // which is what keeps a scaled bitmap face still a bitmap face.
        for (let dy = 0; dy < scale; dy++) {
          const targetRow = (y * scale + dy) * width + originX + x * scale;
          for (let dx = 0; dx < scale; dx++) {
            bits[targetRow + dx] = 1;
          }
        }
      }
    }
  }

  return { width, height, bits, originX: 0, baseline: font.baseline * scale };
}

// The faces served from public/fonts. Registered here rather than discovered,
// so the list the requester shows is the list that exists.
export type BundledFace = { id: string; name: string; url: string };

export const BUNDLED_FACES: BundledFace[] = [
  { id: 'unscii-8', name: 'Unscii 8', url: '/fonts/unscii-8.rpbf' },
];

// Bundled outline faces, all of them designed on a pixel grid.
//
// These need none of the machinery above. A pixel-gridded face is nothing but
// axis-aligned rectangles, and the coverage threshold in glyphRaster.ts only
// ever struggles with curves and diagonals — so they come out of the ordinary
// outline path clean at every size, with no bitmap conversion and no special
// case anywhere downstream. They are here rather than in a stylesheet so they
// load the same way the bitmap faces do, and because @font-face gives no
// signal for "ready", which the rasterizer needs before it measures anything.
//
// The family name is what reaches ctx.font, so it is also the id.
//
// gridSize is the face's own pixel grid, and only sizes that are whole
// multiples of it are offered: between them the glyphs land off the grid they
// were drawn on and the face stops being crisp, which is the entire reason to
// bundle one. It is the same rule the bitmap faces follow through BITMAP_SCALES,
// stated in pixels instead of multiples because these are still outline faces
// measured in px.
export type BundledOutlineFace = { family: string; url: string; gridSize: number };

export const BUNDLED_OUTLINE_FACES: BundledOutlineFace[] = [
  // Already served for the UI (index.html), so listing it costs no bytes.
  { family: 'Press Start 2P', url: '/fonts/press-start-2p-latin.woff2', gridSize: 8 },
  // Its lowercase is drawn as small caps; that is the face, not a fault.
  { family: 'Silkscreen', url: '/fonts/silkscreen.woff2', gridSize: 8 },
];

export function bundledOutlineFace(family: string): BundledOutlineFace | undefined {
  return BUNDLED_OUTLINE_FACES.find((face): boolean => face.family === family);
}

const loaded = new Map<string, BitmapFont>();

export function loadedBitmapFont(id: string): BitmapFont | null {
  return loaded.get(id) ?? null;
}

// Fetched rather than imported: a bundled module would be inlined into the
// built JavaScript, and keeping faces as separate assets is what lets a
// GPL-licensed one (the Amiga conversions) sit beside a public-domain one
// without the two meeting inside a build artifact. See public/fonts/README.txt.
export async function loadBundledFaces(): Promise<void> {
  await Promise.all([
    ...BUNDLED_FACES.map(async (face): Promise<void> => {
      if (loaded.has(face.id)) {
        return;
      }
      const response = await fetch(face.url);
      if (!response.ok) {
        throw new Error(`${face.id}: ${response.status} fetching ${face.url}`);
      }
      loaded.set(face.id, parseBitmapFont(face.id, await response.arrayBuffer()));
    }),
    ...BUNDLED_OUTLINE_FACES.map(
      async (face): Promise<void> => registerOutlineFace(face.family, face.url)
    ),
  ]);
}

// Registers an outline face by its bytes, which is all it takes for
// ctx.font to reach it afterwards — no parsing of the font file at any point.
// The same call is what a font the user supplies would go through, since a
// dropped File gives the identical ArrayBuffer.
export async function registerOutlineFace(
  family: string,
  source: string | ArrayBuffer
): Promise<void> {
  // Tracked here rather than asked of document.fonts. FontFaceSet.check()
  // answers "would this render without waiting", and for a family nothing has
  // registered that is *true* — there is nothing to load, so a system fallback
  // is ready immediately. Used as a guard it skips every load and leaves every
  // bundled face silently substituted by the fallback.
  if (registeredOutlineFaces.has(family)) {
    return;
  }
  registeredOutlineFaces.add(family);
  const bytes = typeof source === 'string' ? await (await fetch(source)).arrayBuffer() : source;
  const face = new FontFace(family, bytes);
  await face.load();
  document.fonts.add(face);
}

const registeredOutlineFaces = new Set<string>();
