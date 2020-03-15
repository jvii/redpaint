import { CustomBrush } from './CustomBrush';

type BuiltInBrushShape = 'cross' | 'dot1' | 'dot2';

export const createBuiltInBrush = (shape: BuiltInBrushShape): CustomBrush => {
  const imageData = createImageDataFor(shape);
  const canvas = document.createElement('canvas');
  canvas.height = imageData.height;
  canvas.width = imageData.width;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Error retreiving context');
  }
  ctx.putImageData(imageData, 0, 0);
  return new CustomBrush(canvas.toDataURL());
};

function createImageDataFor(shape: BuiltInBrushShape): ImageData {
  if (shape === 'cross') {
    const imageData = new ImageData(3, 3);
    setPixel(imageData, 1, 0, 0, 0, 0, 255);
    setPixel(imageData, 0, 1, 0, 0, 0, 255);
    setPixel(imageData, 1, 1, 0, 0, 0, 255);
    setPixel(imageData, 2, 1, 0, 0, 0, 255);
    setPixel(imageData, 1, 2, 0, 0, 0, 255);
    return imageData;
  }
  if (shape === 'dot1') {
    const imageData = new ImageData(4, 4);
    setPixel(imageData, 1, 0, 0, 0, 0, 255);
    setPixel(imageData, 2, 0, 0, 0, 0, 255);
    setPixel(imageData, 0, 1, 0, 0, 0, 255);
    setPixel(imageData, 1, 1, 0, 0, 0, 255);
    setPixel(imageData, 2, 1, 0, 0, 0, 255);
    setPixel(imageData, 3, 1, 0, 0, 0, 255);
    setPixel(imageData, 0, 2, 0, 0, 0, 255);
    setPixel(imageData, 1, 2, 0, 0, 0, 255);
    setPixel(imageData, 2, 2, 0, 0, 0, 255);
    setPixel(imageData, 3, 2, 0, 0, 0, 255);
    setPixel(imageData, 1, 3, 0, 0, 0, 255);
    setPixel(imageData, 2, 3, 0, 0, 0, 255);
    return imageData;
  }
  if (shape === 'dot2') {
    const imageData = new ImageData(5, 5);
    setPixel(imageData, 1, 0, 0, 0, 0, 255);
    setPixel(imageData, 2, 0, 0, 0, 0, 255);
    setPixel(imageData, 3, 0, 0, 0, 0, 255);
    setPixel(imageData, 0, 1, 0, 0, 0, 255);
    setPixel(imageData, 1, 1, 0, 0, 0, 255);
    setPixel(imageData, 2, 1, 0, 0, 0, 255);
    setPixel(imageData, 3, 1, 0, 0, 0, 255);
    setPixel(imageData, 4, 1, 0, 0, 0, 255);
    setPixel(imageData, 0, 2, 0, 0, 0, 255);
    setPixel(imageData, 1, 2, 0, 0, 0, 255);
    setPixel(imageData, 2, 2, 0, 0, 0, 255);
    setPixel(imageData, 3, 2, 0, 0, 0, 255);
    setPixel(imageData, 4, 2, 0, 0, 0, 255);
    setPixel(imageData, 0, 3, 0, 0, 0, 255);
    setPixel(imageData, 1, 3, 0, 0, 0, 255);
    setPixel(imageData, 2, 3, 0, 0, 0, 255);
    setPixel(imageData, 3, 3, 0, 0, 0, 255);
    setPixel(imageData, 4, 3, 0, 0, 0, 255);
    setPixel(imageData, 1, 4, 0, 0, 0, 255);
    setPixel(imageData, 2, 4, 0, 0, 0, 255);
    setPixel(imageData, 3, 4, 0, 0, 0, 255);
    return imageData;
  }
  throw new Error('Unknown shape');
}

function setPixel(
  imageData: ImageData,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a: number
): void {
  const index = x + y * imageData.width;
  imageData.data[index * 4 + 0] = r;
  imageData.data[index * 4 + 1] = g;
  imageData.data[index * 4 + 2] = b;
  imageData.data[index * 4 + 3] = a;
}
