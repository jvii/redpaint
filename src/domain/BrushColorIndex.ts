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

  // The inverse of toIndexedPixels: an indexed image, rows top-down, becoming
  // a brush. What a decoded ILBM hands over (docs/brush-save.md).
  //
  // `transparentColorNumber` is 1-based, as everywhere else here, so a file's
  // 0-based transparent index arrives incremented. Without one the brush has
  // no holes at all, which is what an ILBM with masking off means.
  static fromIndexedPixels(
    width: number,
    height: number,
    pixels: Uint8Array,
    transparentColorNumber?: number
  ): BrushColorIndex {
    const indexArray = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      const sourceRow = y * width;
      const targetRow = (height - 1 - y) * width * 4; // stored bottom-up
      for (let x = 0; x < width; x++) {
        indexArray[targetRow + x * 4] = pixels[sourceRow + x];
        indexArray[targetRow + x * 4 + 3] = ALPHA_INDEXED;
      }
    }
    return new BrushColorIndex(width, height, indexArray, transparentColorNumber);
  }

  // The brush as one byte per pixel, rows top-down, for an indexed encoder.
  // Null when any pixel is true-color, which no indexed format can hold.
  //
  // Transparent pixels are written as the color they were made from, not as
  // the 0 addTransparency left in them: a file says "index N is the hole", so
  // the holes have to actually hold N. A brush with holes but no color to name
  // them by — one loaded from a PNG's alpha — is given `transparentColor`,
  // which the caller picks (docs/brush-save.md).
  toIndexedPixels(transparentColor?: number): {
    pixels: Uint8Array;
    transparentColor?: number;
  } | null {
    const hole = (this.transparentColorNumber ?? 0) - 1;
    const holeIndex = hole >= 0 ? hole : transparentColor;
    const out = new Uint8Array(this.width * this.height);
    for (let y = 0; y < this.height; y++) {
      const sourceRow = (this.height - 1 - y) * this.width * 4; // stored bottom-up
      const targetRow = y * this.width;
      for (let x = 0; x < this.width; x++) {
        const tag = this.indexArray[sourceRow + x * 4 + 3];
        if (tag === ALPHA_TRUECOLOR) {
          return null;
        }
        if (tag === ALPHA_TRANSPARENT) {
          if (holeIndex === undefined) {
            return null;
          }
          out[targetRow + x] = holeIndex;
        } else {
          out[targetRow + x] = this.indexArray[sourceRow + x * 4];
        }
      }
    }
    return { pixels: out, transparentColor: holeIndex };
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
