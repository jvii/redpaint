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
    // initialize as all zeros (transparent)
    const brushColorIndex = new Uint8Array(width * height * 4).fill(0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (stringBitmap[y].charAt(x) === '@') {
          // can be any color index value here, as built in brushes are always colorized
          // and don't have an inherent color
          brushColorIndex[(y * width + x) * stride] = 1;
        }
      }
    }
    return new BrushColorIndex(width, height, brushColorIndex);
  }

  private addTransparency(indexArray: Uint8Array, transparentColorIndex: number): Uint8Array {
    return indexArray.map((item) => (item === transparentColorIndex ? 0 : item));
  }
}
