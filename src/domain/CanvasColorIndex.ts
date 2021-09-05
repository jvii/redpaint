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

  getColorNumberForPixel(pixel: Point, height: number, width: number): number {
    const arrayIndex = pixel.x * 4 + (height - pixel.y - 1) * width * 4;
    return this.indexArray[arrayIndex];
  }

  setColorNumberForPixel(
    pixel: Point,
    colorIndexForPixel: number,
    height: number,
    width: number
  ): void {
    const arrayIndex = pixel.x * 4 + (height - pixel.y - 1) * width * 4;
    this.indexArray[arrayIndex] = colorIndexForPixel;
  }
}
