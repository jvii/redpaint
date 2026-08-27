import { BrushColorIndex } from '../domain/BrushColorIndex';
import { Point } from '../types';
import { CustomBrush } from './CustomBrush';
import { BuiltInFamily, roundBitmap, squareBitmap } from '../algorithm/builtInBrushShapes';

// prettier-ignore
const builtInBrushShapes = {

  'dot3x3': ['.@.',
             '@@@',
             '.@.',],

  'dot5x5': ['.@@@.',
             '@@@@@',
             '@@@@@',
             '@@@@@',
             '.@@@.',],

  'dot7x7': ['..@@@..',
             '.@@@@@.',
             '@@@@@@@',
             '@@@@@@@',
             '@@@@@@@',
             '.@@@@@.',
             '..@@@..',],

  'square2x2': ['@@',
                '@@',],

  'square4x4': ['@@@@',
                '@@@@',
                '@@@@',
                '@@@@',],

  'square6x6': ['@@@@@@',
                '@@@@@@',
                '@@@@@@',
                '@@@@@@',
                '@@@@@@',
                '@@@@@@',],

  'square8x8': ['@@@@@@@@',
                '@@@@@@@@',
                '@@@@@@@@',
                '@@@@@@@@',
                '@@@@@@@@',
                '@@@@@@@@',
                '@@@@@@@@',
                '@@@@@@@@',],

  'dither3x3': ['..@',
                '@..',
                '..@',],

  'dither7x6': ['...@...',
                '.......',
                '@......',
                '...@..@',
                '.......',
                '...@...',],
}

type BuiltInBrushShape = keyof typeof builtInBrushShapes;

export function createBuiltInBrush(shape: BuiltInBrushShape, family: BuiltInFamily): CustomBrush {
  const stringBitmap = builtInBrushShapes[shape];
  const width = stringBitmap[0].length;
  const height = stringBitmap.length;
  const brushColorIndex = BrushColorIndex.fromBuiltInBrushStringBitmap(stringBitmap);
  return new CustomBrush(brushColorIndex, width, height, family);
}

// The dither family (dither3x3/dither7x6) is a hand-placed sparse scatter, not
// a shape that can be stretched to an arbitrary size without turning to mush.
// DPaint didn't try: dragging its DOT_B pen snapped to one of 6 fixed bitmaps
// (CURBRUSH.C: dots10..dots60, decoded below from the original Amiga bitplane
// data in docs/reference/dpaint-source/src/DOTBMS.C, 16-bit words, MSB-first,
// sizes 4s+1 for s=1..6). Resizing a dither brush here snaps to the nearest of
// these the same way.
// prettier-ignore
const ditherBitmaps: readonly string[][] = [
  [
    '@....',
    '.....',
    '....@',
    '.....',
    '.@...',
  ],
  [
    '....@....',
    '.........',
    '.........',
    '........@',
    '@...@....',
    '.........',
    '.........',
    '.........',
    '.....@...',
  ],
  [
    '.....@.......',
    '.............',
    '.........@...',
    '.@...........',
    '......@.....@',
    '.............',
    '.............',
    '.....@.......',
    '@..........@.',
    '.............',
    '.............',
    '....@........',
    '........@....',
  ],
  [
    '.........@.......',
    '.................',
    '...@.............',
    '.............@...',
    '.................',
    '.......@.........',
    '.................',
    '@................',
    '................@',
    '.........@.......',
    '.................',
    '.................',
    '..@..............',
    '............@....',
    '.................',
    '.................',
    '.......@.........',
  ],
  [
    '........@............',
    '.....................',
    '...............@.....',
    '..@..................',
    '.....................',
    '.........@...........',
    '.....................',
    '.............@.......',
    '....................@',
    '.....@...............',
    '.....................',
    '@....................',
    '.....................',
    '........@.....@......',
    '...................@.',
    '..@..................',
    '.....................',
    '.....................',
    '.....................',
    '............@........',
    '.......@.............',
  ],
  [
    '...........@.............',
    '.........................',
    '.........................',
    '...@.....................',
    '....................@....',
    '........@................',
    '.............@...........',
    '.........................',
    '..................@......',
    '.........................',
    '@........................',
    '........@................',
    '........................@',
    '.........................',
    '....@..........@.........',
    '.........................',
    '.........................',
    '.........................',
    '...........@.............',
    '.........................',
    '....@...............@....',
    '.........................',
    '.........................',
    '.........................',
    '...........@.............',
  ],
];

function nearestDitherBitmap(width: number, height: number): string[] {
  const target = (width + height) / 2;
  let closest = ditherBitmaps[0];
  let closestDiff = Infinity;
  for (const bitmap of ditherBitmaps) {
    const diff = Math.abs(bitmap.length - target);
    if (diff < closestDiff) {
      closest = bitmap;
      closestDiff = diff;
    }
  }
  return closest;
}

function generateBuiltInBitmap(family: BuiltInFamily, width: number, height: number): string[] {
  switch (family) {
    case 'round':
      return roundBitmap(width, height);
    case 'square':
      return squareBitmap(width, height);
    case 'dither':
      return nearestDitherBitmap(width, height);
  }
}

// Right-click resize on a built-in brush icon (docs/brush-transforms.md,
// "Sizing a built-in brush"): regenerates the shape at the dragged size
// instead of bitmap-stretching the small fixed art, the same call DPaint's
// SizePen made (RoundPen/SquarePen/DotsPen, CURBRUSH.C) rather than reusing
// its custom-brush Stretch (STRETCH.C).
export function createSizedBuiltInBrush(
  family: BuiltInFamily,
  width: number,
  height: number
): CustomBrush {
  const stringBitmap = generateBuiltInBitmap(family, width, height);
  const brushColorIndex = BrushColorIndex.fromBuiltInBrushStringBitmap(stringBitmap);
  return new CustomBrush(brushColorIndex, stringBitmap[0].length, stringBitmap.length, family);
}

// Below this the round family is hand-drawn art rather than a rasterized
// ellipse, so it is left at whatever pixel shape the screen has.
const ROUND_GENERATOR_FLOOR = 5;

// The preset as it should be at the current pixel shape (docs/pixel-aspect.md).
//
// At 1:1 that is the hand-drawn art, which the generators do not reproduce —
// roundBitmap(3,3) is a solid block where dot3x3 is a plus — so the familiar
// shapes are left exactly as they are on Lo-Res, Hi-Res and Native. Elsewhere
// the family is regenerated at a size that comes out square on screen, which
// is what DPaint's SelPen does for every pen it hands out.
//
// Dither is exempt: DPaint passes DOT_B the raw size, a texture having no
// roundness to preserve, and stretching one would only change its density.
export function builtInBrushForAspect(brush: CustomBrush, aspect: Point): CustomBrush {
  const family = brush.builtInFamily;
  if (!family || family === 'dither' || aspect.x === aspect.y) {
    return brush;
  }
  // Presets are square at 1:1, so either side is the size being asked for.
  const size = Math.max(brush.width, brush.heigth);
  // The finest round pen is a cross, and no ellipse is: roundBitmap(3,3) is a
  // solid block, and at 2:1 it becomes a 6x3 blob. The generator reproduces
  // dot5x5 and dot7x7 exactly, so it can speak for them and not for this one.
  if (family === 'round' && size < ROUND_GENERATOR_FLOOR) {
    return brush;
  }
  return createSizedBuiltInBrush(family, size / aspect.x, size / aspect.y);
}
