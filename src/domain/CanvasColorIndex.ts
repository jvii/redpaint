import { Color, PaintColor, Point } from '../types';

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

  // Builds an indexed canvas from per-pixel 0-based palette positions (the
  // output of mapToPalette), all pixels tagged ALPHA_INDEXED. Rows are flipped
  // like fromImageData: image rows are top-down, texture rows bottom-up.
  static fromIndexedPixels(width: number, height: number, indices: Uint8Array): CanvasColorIndex {
    const indexArray = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      const sourceRow = y * width;
      const targetRow = (height - y - 1) * width * 4;
      for (let x = 0; x < width; x++) {
        indexArray[targetRow + x * 4] = indices[sourceRow + x];
        indexArray[targetRow + x * 4 + 3] = ALPHA_INDEXED;
      }
    }
    return new CanvasColorIndex(width, height, indexArray);
  }

  // The export-side mirror of fromIndexedPixels: per-pixel 0-based palette
  // positions in top-down row order (texture rows are stored bottom-up, so rows
  // are flipped here). Returns null if any pixel is true color. An indexed
  // export has no representation for those; the caller decides what to tell the
  // user.
  toIndexedPixels(): Uint8Array | null {
    const out = new Uint8Array(this.width * this.height);
    for (let y = 0; y < this.height; y++) {
      const sourceRow = (this.height - 1 - y) * this.width * 4;
      const targetRow = y * this.width;
      for (let x = 0; x < this.width; x++) {
        if (this.indexArray[sourceRow + x * 4 + 3] === ALPHA_TRUECOLOR) {
          return null;
        }
        out[targetRow + x] = this.indexArray[sourceRow + x * 4];
      }
    }
    return out;
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

  // Whether any pixel is true color (the canvas is hybrid rather than fully
  // indexed). A tag scan with an early exit: a true-color image answers on the
  // first pixel; a fully indexed canvas costs one pass. Memoized. Undo
  // snapshots are built fresh by getIndex() and never written to afterwards, so
  // the answer cannot change under an instance.
  private trueColorScan: boolean | null = null;
  hasTrueColorPixels(): boolean {
    if (this.trueColorScan === null) {
      this.trueColorScan = false;
      for (let i = 3; i < this.indexArray.length; i += 4) {
        if (this.indexArray[i] === ALPHA_TRUECOLOR) {
          this.trueColorScan = true;
          break;
        }
      }
    }
    return this.trueColorScan;
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

  // Nearest-neighbor resize. Each destination pixel copies a whole source pixel
  // verbatim, so indices, true colors and tags survive and no new colors are
  // introduced: the right scaling for pixel art, and what keeps an indexed image
  // indexed. Works on the stored (bottom-up) rows; proportional row mapping
  // keeps the orientation, so no flip is needed.
  resizedTo(width: number, height: number): CanvasColorIndex {
    const destArray = new Uint8Array(width * height * 4);
    const dest32 = new Uint32Array(destArray.buffer);
    const source32 = this.pixel32Array;
    for (let destY = 0; destY < height; destY++) {
      const sourceY = Math.min(this.height - 1, Math.floor((destY * this.height) / height));
      const destRow = destY * width;
      const sourceRow = sourceY * this.width;
      for (let destX = 0; destX < width; destX++) {
        const sourceX = Math.min(this.width - 1, Math.floor((destX * this.width) / width));
        dest32[destRow + destX] = source32[sourceRow + sourceX];
      }
    }
    return new CanvasColorIndex(width, height, destArray);
  }

  // Places this content, unscaled, into the top-left of a new canvas of the
  // given size, filling the rest with the background color and cropping any
  // overflow. DPaint's behaviour: a canvas that grows adds to the right and
  // bottom, one that shrinks takes from there. Cropping to a chosen region is
  // croppedTo's job.
  placedInto(width: number, height: number, backgroundColorNumber: number): CanvasColorIndex {
    return this.copiedInto(width, height, backgroundColorNumber, 0, 0);
  }

  // Keeps just the given canvas-coordinate rectangle, which is what an
  // interactive crop selects. The same copy as placedInto, addressed by the
  // region to keep rather than by where the old content should sit: a crop box
  // can be anywhere, which no anchor can express.
  croppedTo(
    rect: { x: number; y: number; width: number; height: number },
    backgroundColorNumber: number
  ): CanvasColorIndex {
    return this.copiedInto(rect.width, rect.height, backgroundColorNumber, -rect.x, -rect.y);
  }

  // offsetX/offsetY say where this content's origin lands in the destination's
  // canvas coordinates; anything falling outside is cropped, anything left
  // uncovered keeps the background color.
  private copiedInto(
    width: number,
    height: number,
    backgroundColorNumber: number,
    offsetX: number,
    offsetY: number
  ): CanvasColorIndex {
    const dest = CanvasColorIndex.createEmptyWithBackgroundColor(
      width,
      height,
      backgroundColorNumber
    );
    const startX = Math.max(0, offsetX);
    const endX = Math.min(width, offsetX + this.width);
    const startY = Math.max(0, offsetY);
    const endY = Math.min(height, offsetY + this.height);

    for (let destY = startY; destY < endY; destY++) {
      const sourceRow = (this.height - 1 - (destY - offsetY)) * this.width;
      const destRow = (height - 1 - destY) * width;
      for (let destX = startX; destX < endX; destX++) {
        dest.pixel32Array[destRow + destX] = this.pixel32Array[sourceRow + (destX - offsetX)];
      }
    }
    return dest;
  }

  // Composites `other` over this one, treating `other`'s pixels of the given
  // color number as transparent — the stencil SPARE.C builds with MakeMask and
  // paints through with MaskBlit, and what DPaint's Merge In Front does. The
  // result is this canvas's size, with `other` anchored top-left and anything
  // past the edges dropped, like every other size-mismatched copy here.
  //
  // Only an *indexed* pixel can be transparent: the test is against the packed
  // 32-bit value, and a true-color pixel carries ALPHA_TRUECOLOR, so it can
  // never equal an indexed background and always paints.
  mergedWith(other: CanvasColorIndex, transparentColorNumber: number): CanvasColorIndex {
    const merged = new CanvasColorIndex(this.width, this.height, new Uint8Array(this.indexArray));
    const transparent = CanvasColorIndex.packIndexed(transparentColorNumber);
    const endX = Math.min(this.width, other.width);
    const endY = Math.min(this.height, other.height);
    for (let y = 0; y < endY; y++) {
      // Both are addressed in canvas coordinates (y down from the top) while
      // the rows are stored bottom-up, so each side flips against its own
      // height — they need not be the same size.
      const sourceRow = (other.height - 1 - y) * other.width;
      const destRow = (this.height - 1 - y) * this.width;
      for (let x = 0; x < endX; x++) {
        const pixel = other.pixel32Array[sourceRow + x];
        if (pixel !== transparent) {
          merged.pixel32Array[destRow + x] = pixel;
        }
      }
    }
    return merged;
  }

  // Conforms every pixel to a palette (the DPaint-spirited automatic color
  // reduction, done properly: the Amiga just dropped bitplanes and let the
  // indices alias). With remapAll unset, indexed pixels within the new depth
  // keep their index (a truncation shrink leaves surviving slots unchanged) and
  // only pixels beyond it resolve to their old color and take the nearest new
  // one; with remapAll set (a rebuilt palette, where every slot changed) all
  // indexed pixels remap that way. True-color pixels are flattened the same way
  // when includeTrueColor is set (the True Color switch turning off), otherwise
  // kept verbatim.
  conformedTo(
    oldPalette: Color[],
    newPalette: Color[],
    includeTrueColor: boolean,
    remapAll: boolean,
    nearest: (r: number, g: number, b: number) => number
  ): CanvasColorIndex {
    const source = this.indexArray;
    const dest = new Uint8Array(source.length);
    for (let i = 0; i < source.length; i += 4) {
      const tag = source[i + 3];
      if (tag === ALPHA_TRUECOLOR) {
        if (includeTrueColor) {
          dest[i] = nearest(source[i], source[i + 1], source[i + 2]);
          dest[i + 3] = ALPHA_INDEXED;
        } else {
          dest[i] = source[i];
          dest[i + 1] = source[i + 1];
          dest[i + 2] = source[i + 2];
          dest[i + 3] = tag;
        }
      } else {
        const index = source[i]; // stored 0-based
        if (!remapAll && index < newPalette.length) {
          dest[i] = index;
        } else {
          const old = oldPalette[index] ?? { r: 0, g: 0, b: 0 };
          dest[i] = nearest(old.r, old.g, old.b);
        }
        dest[i + 3] = ALPHA_INDEXED;
      }
    }
    return new CanvasColorIndex(this.width, this.height, dest);
  }

  // DPaint II's Picture > Color Control > Bg -> Fg: every pixel holding one
  // color number now holds another. Unlike the brush operation of the same
  // name there is no transparency involved — a picture has no holes, so this is
  // a plain color substitution over the raster.
  //
  // True-color pixels are left alone throughout: they hold no index to compare.
  withColorReplaced(fromColorNumber: number, toColorNumber: number): CanvasColorIndex {
    const from = fromColorNumber - 1; // stored 0-based
    const to = toColorNumber - 1;
    const dest = new Uint8Array(this.indexArray);
    for (let i = 0; i < dest.length; i += 4) {
      if (dest[i + 3] !== ALPHA_TRUECOLOR && dest[i] === from) {
        dest[i] = to;
      }
    }
    return new CanvasColorIndex(this.width, this.height, dest);
  }

  // Bg <-> Fg: the two color numbers change places wherever either appears.
  withColorsSwapped(aColorNumber: number, bColorNumber: number): CanvasColorIndex {
    const a = aColorNumber - 1;
    const b = bColorNumber - 1;
    const dest = new Uint8Array(this.indexArray);
    for (let i = 0; i < dest.length; i += 4) {
      if (dest[i + 3] === ALPHA_TRUECOLOR) {
        continue;
      }
      if (dest[i] === a) {
        dest[i] = b;
      } else if (dest[i] === b) {
        dest[i] = a;
      }
    }
    return new CanvasColorIndex(this.width, this.height, dest);
  }

  // The canvas resolved to displayable RGBA pixels (indexed pixels through the
  // palette, true-color pixels directly): the input for extracting an optimal
  // palette from the picture itself. Row order is the stored one; palette
  // building is orientation-blind.
  resolveToRGBA(palette: Color[]): Uint8ClampedArray {
    const source = this.indexArray;
    const rgba = new Uint8ClampedArray(source.length);
    for (let i = 0; i < source.length; i += 4) {
      if (source[i + 3] === ALPHA_TRUECOLOR) {
        rgba[i] = source[i];
        rgba[i + 1] = source[i + 1];
        rgba[i + 2] = source[i + 2];
      } else {
        const color = palette[source[i]] ?? { r: 0, g: 0, b: 0 };
        rgba[i] = color.r;
        rgba[i + 1] = color.g;
        rgba[i + 2] = color.b;
      }
      rgba[i + 3] = 255;
    }
    return rgba;
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
