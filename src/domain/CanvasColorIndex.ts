import { PaintColor, Point } from '../types';

// Per-pixel tag stored in the alpha byte of the color index texture (see
// docs/true-color-mode.md). Indexed pixels store a 0-based palette position in
// R (the app-level color number / palette id is 1-based; the conversion happens
// only here at the storage boundary, so all 256 palette slots are usable).
// True-color pixels store a literal RGB color. ALPHA_TRANSPARENT is only
// meaningful in brush textures (the canvas itself is never transparent).
export const ALPHA_TRANSPARENT = 0;
export const ALPHA_INDEXED = 127;
export const ALPHA_TRUECOLOR = 255;

export class CanvasColorIndex {
  width: number;
  height: number;
  // Internally we store the color index as a typed array.
  // This is because we use the color indes as a webgl texture.
  // Each pixel is represented by 4 components (corresponding to r,g,b,a)
  indexArray: Uint8Array;
  // The same buffer viewed as one 32-bit value per pixel (little-endian
  // RGBA), for whole-pixel comparisons and writes.
  private pixel32Array: Uint32Array;

  constructor(width: number, height: number, indexArray: Uint8Array) {
    this.width = width;
    this.height = height;
    this.indexArray = indexArray;
    this.pixel32Array = new Uint32Array(
      indexArray.buffer,
      indexArray.byteOffset,
      indexArray.length / 4
    );
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
    // We use the R component to store the color number and tag the pixel
    // as indexed in the A component

    for (let i = 0; i < arrayLength; i = i + stride) {
      indexArray[i] = backgroundColorNumber - 1; // stored 0-based
      indexArray[i + 3] = ALPHA_INDEXED;
    }

    return new CanvasColorIndex(width, height, indexArray);
  }

  // Builds a true-color index from decoded image pixels (all pixels tagged
  // ALPHA_TRUECOLOR). ImageData rows are top-down while texture rows are
  // bottom-up, so rows are flipped here.
  static fromImageData(imageData: ImageData): CanvasColorIndex {
    const { width, height, data } = imageData;
    const indexArray = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      const sourceRow = y * width * 4;
      const targetRow = (height - y - 1) * width * 4;
      for (let x = 0; x < width; x++) {
        indexArray[targetRow + x * 4] = data[sourceRow + x * 4];
        indexArray[targetRow + x * 4 + 1] = data[sourceRow + x * 4 + 1];
        indexArray[targetRow + x * 4 + 2] = data[sourceRow + x * 4 + 2];
        indexArray[targetRow + x * 4 + 3] = ALPHA_TRUECOLOR;
      }
    }
    return new CanvasColorIndex(width, height, indexArray);
  }

  // Packs an indexed-pixel value for whole-pixel (32-bit) comparisons.
  // Typed arrays are little-endian in practice, so RGBA bytes read as
  // R | G<<8 | B<<16 | A<<24.
  static packIndexed(colorNumber: number): number {
    return ((colorNumber - 1) | (ALPHA_INDEXED << 24)) >>> 0; // stored 0-based
  }

  // Packs the pixel value a PaintColor paints (tagged indexed or true color).
  static packPaintColor(paintColor: PaintColor): number {
    if (paintColor.kind === 'rgb') {
      const { r, g, b } = paintColor.color;
      return ((r | (g << 8) | (b << 16) | (ALPHA_TRUECOLOR << 24)) >>> 0) as number;
    }
    return CanvasColorIndex.packIndexed(paintColor.colorNumber);
  }

  isTrueColorPixel(pixel: Point): boolean {
    const arrayIndex = pixel.x * 4 + (this.height - pixel.y - 1) * this.width * 4;
    return this.indexArray[arrayIndex + 3] === ALPHA_TRUECOLOR;
  }

  // The PaintColor that would reproduce this pixel (used by the color picker).
  getPaintColorForPixel(pixel: Point): PaintColor {
    const arrayIndex = pixel.x * 4 + (this.height - pixel.y - 1) * this.width * 4;
    if (this.indexArray[arrayIndex + 3] === ALPHA_TRUECOLOR) {
      return {
        kind: 'rgb',
        color: {
          r: this.indexArray[arrayIndex],
          g: this.indexArray[arrayIndex + 1],
          b: this.indexArray[arrayIndex + 2],
        },
      };
    }
    return { kind: 'index', colorNumber: this.indexArray[arrayIndex] + 1 };
  }

  // Whole-pixel (RGBA as one 32-bit value) access, used by flood fill so that
  // true-color pixels compare by their full color, not just the R byte.
  getPixel32(pixel: Point): number {
    return this.pixel32Array[pixel.x + (this.height - pixel.y - 1) * this.width];
  }

  setPixel32(pixel: Point, value: number): void {
    this.pixel32Array[pixel.x + (this.height - pixel.y - 1) * this.width] = value;
  }
}
