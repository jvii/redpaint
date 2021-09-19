import { Point } from '../types';

export class CanvasColorIndex {
  width: number;
  height: number;
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
    // initilize an array with all zeros
    const arrayLength = width * height * 4;
    const indexArray = new Uint8Array(arrayLength).fill(0);

    // Give each pixel an initial color number (the background color)
    // We use the R component to store the color number
    const initial = 0;
    const stride = 4;
    for (let i = initial; i < arrayLength; i = i + stride) {
      indexArray[i] = backgroundColorNumber;
    }
    return new CanvasColorIndex(width, height, indexArray);
  }

  getColorNumberForPixel(pixel: Point, height: number, width: number): number {
    const arrayIndex = pixel.x * 4 + (height - pixel.y - 1) * width * 4;
    return this.indexArray[arrayIndex];
  }

  setColorNumberForPixel(
    pixel: Point,
    colorNumberForPixel: number,
    height: number,
    width: number
  ): void {
    const arrayIndex = pixel.x * 4 + (height - pixel.y - 1) * width * 4;
    this.indexArray[arrayIndex] = colorNumberForPixel;
  }
}
