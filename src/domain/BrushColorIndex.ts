import { ALPHA_INDEXED, ALPHA_TRANSPARENT, ALPHA_TRUECOLOR } from './CanvasColorIndex';

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

  // Builds a brush from decoded image pixels: opaque pixels become true-color
  // pixels, (semi-)transparent image pixels become transparent brush pixels.
  // ImageData rows are top-down while texture rows are bottom-up, so rows are
  // flipped here.
  static fromImageData(imageData: ImageData): BrushColorIndex {
    const { width, height, data } = imageData;
    const indexArray = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      const sourceRow = y * width * 4;
      const targetRow = (height - y - 1) * width * 4;
      for (let x = 0; x < width; x++) {
        if (data[sourceRow + x * 4 + 3] < 128) {
          continue; // transparent (alpha tag stays 0)
        }
        indexArray[targetRow + x * 4] = data[sourceRow + x * 4];
        indexArray[targetRow + x * 4 + 1] = data[sourceRow + x * 4 + 1];
        indexArray[targetRow + x * 4 + 2] = data[sourceRow + x * 4 + 2];
        indexArray[targetRow + x * 4 + 3] = ALPHA_TRUECOLOR;
      }
    }
    return new BrushColorIndex(width, height, indexArray);
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
