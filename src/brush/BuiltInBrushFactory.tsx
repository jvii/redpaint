import { BrushColorIndex } from '../domain/BrushColorIndex';
import { CustomBrush } from './CustomBrush';

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

export function createBuiltInBrush(shape: BuiltInBrushShape): CustomBrush {
  const stringBitmap = builtInBrushShapes[shape];
  const width = stringBitmap[0].length;
  const height = stringBitmap.length;
  const brushColorIndex = BrushColorIndex.fromBuiltInBrushStringBitmap(stringBitmap);
  return new CustomBrush(brushColorIndex, width, height);
}
