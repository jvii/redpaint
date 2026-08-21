import { ALPHA_INDEXED, ALPHA_TRANSPARENT, ALPHA_TRUECOLOR } from './CanvasColorIndex';

export class BrushColorIndex {
  width: number;
  height: number;
  indexArray: Uint8Array;

  // Which palette color the transparent pixels were made from, 1-based, when
  // this bitmap has one. Kept because addTransparency zeroes the pixels it
  // tags, so the number is unrecoverable afterwards and the background may
  // have moved on since — and writing an IFF brush has to declare it
  // (docs/brush-save.md). Undefined for a bitmap whose transparency came from
  // a source's alpha rather than from a color: nothing was chosen there.
  transparentColorNumber?: number;

  constructor(
    width: number,
    height: number,
    indexArray: Uint8Array,
    transparentColorNumber?: number
  ) {
    this.width = width;
    this.height = height;
    this.indexArray = indexArray;
    // A color number is 1-based, so 0 means "none" here rather than "index 0".
    if (transparentColorNumber) {
      this.indexArray = this.addTransparency(indexArray, transparentColorNumber);
      this.transparentColorNumber = transparentColorNumber;
    }
  }

  // A bitmap derived from this one — reshaped, recolored — is the same brush
  // and keeps the same transparent color. Its pixels are already tagged, so
  // the constructor must not re-apply it: that would tag every pixel *now*
  // holding the color, including ones the transform brought in.
  public derive(width: number, height: number, indexArray: Uint8Array): BrushColorIndex {
    const derived = new BrushColorIndex(width, height, indexArray);
    derived.transparentColorNumber = this.transparentColorNumber;
    return derived;
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

  // Factory method for creating a BrushColorIndex from a laid-out text run
  // (PixelFont.ts). Same shape as fromBuiltInBrushStringBitmap: the set pixels
  // are marked opaque and their stored index left at 0, because a text run has
  // no inherent color of its own and is always colorized to FG.
  static fromTextRunBits(width: number, height: number, bits: Uint8Array): BrushColorIndex {
    const stride = 4;
    // initialize as all zeros (transparent: alpha tag 0)
    const indexArray = new Uint8Array(width * height * 4).fill(0);
    for (let y = 0; y < height; y++) {
      // run rows are top-down while texture rows are bottom-up
      const sourceRow = (height - y - 1) * width;
      for (let x = 0; x < width; x++) {
        if (bits[sourceRow + x]) {
          indexArray[(y * width + x) * stride + 3] = ALPHA_INDEXED;
        }
      }
    }
    return new BrushColorIndex(width, height, indexArray);
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

  // Same as fromImageData, but opaque pixels are indexed against indexByColor
  // (a 24-bit RGB -> 0-based palette position map, built by the brush load
  // requester from remapColorsGreedy) instead of carrying their own literal
  // RGB: the "remap to current palette" load option.
  static fromRemappedImageData(
    imageData: ImageData,
    indexByColor: Map<number, number>
  ): BrushColorIndex {
    const { width, height, data } = imageData;
    const indexArray = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      const sourceRow = y * width * 4;
      const targetRow = (height - y - 1) * width * 4;
      for (let x = 0; x < width; x++) {
        if (data[sourceRow + x * 4 + 3] < 128) {
          continue; // transparent (alpha tag stays 0)
        }
        const rgb =
          (data[sourceRow + x * 4] << 16) |
          (data[sourceRow + x * 4 + 1] << 8) |
          data[sourceRow + x * 4 + 2];
        indexArray[targetRow + x * 4] = indexByColor.get(rgb) ?? 0;
        indexArray[targetRow + x * 4 + 3] = ALPHA_INDEXED;
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
