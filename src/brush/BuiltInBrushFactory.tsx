import { CustomBrush } from './CustomBrush';

type BuiltInBrushShape =
  | 'dot3x3'
  | 'dot5x5'
  | 'dot7x7'
  | 'square2x2'
  | 'square4x4'
  | 'square6x6'
  | 'square8x8'
  | 'dither3x3'
  | 'dither7x6';

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
  if (shape === 'dot3x3') {
    // prettier-ignore
    const bitmap = '.@.' +
                   '@@@' +
                   '.@.';
    return stringBitmapToImageData(bitmap, 3, 3);
  }
  if (shape === 'dot5x5') {
    // prettier-ignore
    const bitmap = '.@@@.' +
                   '@@@@@' +
                   '@@@@@' +
                   '@@@@@' +
                   '.@@@.';
    return stringBitmapToImageData(bitmap, 5, 5);
  }
  if (shape === 'dot7x7') {
    // prettier-ignore
    const bitmap = '..@@@..' +
                   '.@@@@@.' +
                   '@@@@@@@' +
                   '@@@@@@@' +
                   '@@@@@@@' +
                   '.@@@@@.' +
                   '..@@@..';
    return stringBitmapToImageData(bitmap, 7, 7);
  }
  if (shape === 'square2x2') {
    // prettier-ignore
    const bitmap = '@@' +
                   '@@';
    return stringBitmapToImageData(bitmap, 2, 2);
  }
  if (shape === 'square4x4') {
    // prettier-ignore
    const bitmap = '@@@@' +
                   '@@@@' +
                   '@@@@' +
                   '@@@@';
    return stringBitmapToImageData(bitmap, 4, 4);
  }
  if (shape === 'square6x6') {
    // prettier-ignore
    const bitmap = '@@@@@@' +
                   '@@@@@@' +
                   '@@@@@@' +
                   '@@@@@@' +
                   '@@@@@@' +
                   '@@@@@@';
    return stringBitmapToImageData(bitmap, 6, 6);
  }
  if (shape === 'square8x8') {
    // prettier-ignore
    const bitmap = '@@@@@@@@' +
                   '@@@@@@@@' +
                   '@@@@@@@@' +
                   '@@@@@@@@' +
                   '@@@@@@@@' +
                   '@@@@@@@@' +
                   '@@@@@@@@' +
                   '@@@@@@@@';
    return stringBitmapToImageData(bitmap, 8, 8);
  }
  if (shape === 'dither3x3') {
    // prettier-ignore
    const bitmap = '..@' +
                   '@..' +
                   '..@';
    return stringBitmapToImageData(bitmap, 3, 3);
  }
  if (shape === 'dither7x6') {
    // prettier-ignore
    const bitmap = '...@...' +
                   '.......' +
                   '@......' +
                   '...@..@' +
                   '.......' +
                   '...@...';
    return stringBitmapToImageData(bitmap, 8, 8);
  }
  throw new Error('Unknown shape <' + shape + '> while creating built-in brush');
}

function stringBitmapToImageData(string: string, width: number, height: number): ImageData {
  const imageData = new ImageData(width, height);
  for (let i = 0; i < string.length; i++) {
    if (string.charAt(i) === '@') {
      imageData.data[i * 4 + 0] = 0;
      imageData.data[i * 4 + 1] = 0;
      imageData.data[i * 4 + 2] = 0;
      imageData.data[i * 4 + 3] = 255;
    }
  }
  return imageData;
}
