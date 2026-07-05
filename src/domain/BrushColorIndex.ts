import { ALPHA_INDEXED, ALPHA_TRANSPARENT } from './CanvasColorIndex';

export class BrushColorIndex {
  width: number;
  height: number;
  indexArray: Uint8Array;

  constructor(
    width: number,
    height: number,
    indexArray: Uint8Array,
    transparentColorNumber?: number
  ) {
    this.width = width;
    this.height = height;
    this.indexArray = indexArray;
    if (transparentColorNumber) {
      this.indexArray = this.addTransparency(indexArray, transparentColorNumber);
    }
  }

  // Factory method for creating a BrushColorIndex from builtInBrushStringBitmap
  static fromBuiltInBrushStringBitmap(builtInBrushStringBitmap: string[]): BrushColorIndex {
    // flip y as texture y coordinates start from bottom
    const stringBitmap = builtInBrushStringBitmap.reverse();
    const width = stringBitmap[0].length;
    const height = stringBitmap.length;
    const stride = 4;
    // initialize as all zeros (transparent: alpha tag 0)
    const brushColorIndex = new Uint8Array(width * height * 4).fill(0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (stringBitmap[y].charAt(x) === '@') {
          // the alpha tag marks the pixel opaque; the stored index can stay 0,
          // as built in brushes are always colorized and don't have an
          // inherent color
          brushColorIndex[(y * width + x) * stride + 3] = ALPHA_INDEXED;
        }
      }
    }
    return new BrushColorIndex(width, height, brushColorIndex);
  }

  // Marks the pixels whose indexed color equals the transparent color number
  // (1-based palette id) as transparent (alpha tag 0). True-color pixels are
  // never transparent.
  private addTransparency(indexArray: Uint8Array, transparentColorNumber: number): Uint8Array {
    const result = new Uint8Array(indexArray);
    const storedIndex = transparentColorNumber - 1; // stored 0-based
    for (let i = 0; i < result.length; i += 4) {
      if (result[i + 3] === ALPHA_INDEXED && result[i] === storedIndex) {
        result[i] = 0;
        result[i + 1] = 0;
        result[i + 2] = 0;
        result[i + 3] = ALPHA_TRANSPARENT;
      }
    }
    return result;
  }
}
