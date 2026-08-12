import { BrushColorIndex } from '../domain/BrushColorIndex';
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
