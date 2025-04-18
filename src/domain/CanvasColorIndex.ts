import { Point } from '../types';

export class CanvasColorIndex {
  width: number;
  height: number;
  // Internally we store the color index as a typed array.
  // This is because we use the color indes as a webgl texture.
  // Each pixel is represented by 4 components (corresponding to r,g,b,a)
  indexArray: Uint8Array;

  constructor(width: number, height: number, indexArray: Uint8Array) {
    this.width = width;
    this.height = height;
    this.indexArray = indexArray;
  }

  static createEmptyWithBackgroundColor(
    width: number,
    height: number,
    backgroundColorNumber: number
  ): CanvasColorIndex {
    const stride = 4;
    const arrayLength = width * height * stride;
    const indexArray = new Uint8Array(arrayLength).fill(0);

    // Give each pixel an initial color number (the background color)
    // We use the R component to store the color number

    for (let i = 0; i < arrayLength; i = i + stride) {
      indexArray[i] = backgroundColorNumber;
    }

    return new CanvasColorIndex(width, height, indexArray);
  }

  getColorNumberForPixel(pixel: Point): number {
    const arrayIndex = pixel.x * 4 + (this.height - pixel.y - 1) * this.width * 4;
    return this.indexArray[arrayIndex];
  }

  // Used by floodfill
  setColorNumberForPixel(pixel: Point, colorNumberForPixel: number): void {
    const arrayIndex = pixel.x * 4 + (this.height - pixel.y - 1) * this.width * 4;
    this.indexArray[arrayIndex] = colorNumberForPixel;
  }
}
