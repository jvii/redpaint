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
  return new CustomBrush(createColorIndexFor(shape), width, height);
}

function createColorIndexFor(shape: BuiltInBrushShape): Uint8Array {
  // flip y as texture y coordinates start from bottom
  const stringBitmap = builtInBrushShapes[shape].reverse();
  const width = stringBitmap[0].length;
  const height = stringBitmap.length;
  const stride = 4;
  // initialize as all zeros (transparent)
  const brushColorIndex = new Uint8Array(width * height * 4).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (stringBitmap[y].charAt(x) === '@') {
        // can be any color index value here, as built in brushes are always colorized
        // and don't have an inherent color
        brushColorIndex[(y * width + x) * stride] = 1;
      }
    }
  }
  return brushColorIndex;
}
