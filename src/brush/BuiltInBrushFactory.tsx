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

export const createBuiltInBrush = (shape: BuiltInBrushShape): CustomBrush => {
  const imageData = createImageDataFor(shape);
  const canvas = document.createElement('canvas');
  canvas.height = imageData.height;
  canvas.width = imageData.width;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Error retreiving context while creating built-in brush');
  }
  ctx.putImageData(imageData, 0, 0);
  return new CustomBrush(canvas.toDataURL());
};

function createImageDataFor(shape: BuiltInBrushShape): ImageData {
  return stringBitmapToImageData(builtInBrushShapes[shape]);
}

function stringBitmapToImageData(stringBitmap: string[]): ImageData {
  const width = stringBitmap[0].length;
  const height = stringBitmap.length;
  const imageData = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (stringBitmap[y].charAt(x) === '@') {
        imageData.data[(y * width + x) * 4 + 0] = 0;
        imageData.data[(y * width + x) * 4 + 1] = 0;
        imageData.data[(y * width + x) * 4 + 2] = 0;
        imageData.data[(y * width + x) * 4 + 3] = 255;
      }
    }
  }
  return imageData;
}
