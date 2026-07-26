import { BrushColorIndex } from '../domain/BrushColorIndex';
import { CustomBrush } from './CustomBrush';
import { BuiltInFamily, generateBuiltInBitmap } from '../algorithm/builtInBrushShapes';

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
  return new CustomBrush(
    brushColorIndex,
    stringBitmap[0].length,
    stringBitmap.length,
    family
  );
}
