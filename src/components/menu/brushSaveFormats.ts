import { encodeIlbm } from '../../fileformat/ilbm';
import { plainPalette } from '../../algorithm/imageColors';
import { CustomBrush } from '../../brush/CustomBrush';
import { Color } from '../../types';
import { BlobMaker } from './saveFormats';
import { canvasPngBlob, SaveFileType } from './saveAsPng';

// What a brush can be written as, the same shape saveFormats.ts holds for a
// picture. Two rather than three: GIF would need its palette recovered on the
// way back in, and nothing reads one today (docs/brush-save.md).
export type BrushSaveFormat = 'png' | 'iff';

export const BRUSH_SAVE_FORMATS: BrushSaveFormat[] = ['png', 'iff'];

export type BrushSaveFormatSpec = {
  label: string;
  note: string;
  fileType: SaveFileType;
};

export const brushSaveFormats: { [format in BrushSaveFormat]: BrushSaveFormatSpec } = {
  png: {
    label: 'PNG',
    note: 'True color, with real transparency. Read anywhere.',
    fileType: { description: 'PNG image', mime: 'image/png', extension: '.png' },
  },
  iff: {
    label: 'IFF',
    note: 'Indexed. Amiga ILBM — a DPaint brush, keeping the palette and the transparent color.',
    fileType: { description: 'IFF ILBM brush', mime: 'image/x-ilbm', extension: '.iff' },
  },
};

// The one thing IFF cannot hold. Asked of the brush rather than the picture:
// a brush carries its own pixels, and a true-color one can sit in an indexed
// picture perfectly happily.
export function brushIsIndexed(brush: CustomBrush): boolean {
  return brush.brushColorIndexForSaving().toIndexedPixels() !== null;
}

export const BRUSH_TRUE_COLOR_REFUSAL =
  'The brush has True Color pixels, and this format stores palette-indexed pixels only. ' +
  'Save it as PNG instead.';

// Builds the thing that produces the bytes, deferred as the picture's is, so
// backing out of a save picker costs no encoding.
export function brushBlobMakerFor(
  brush: CustomBrush,
  format: BrushSaveFormat,
  palette: Color[]
): BlobMaker | null {
  if (format === 'png') {
    const image = brush.toImageData();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext('2d')?.putImageData(image, 0, 0);
    return canvasPngBlob(canvas);
  }

  const indexed = brush.brushColorIndexForSaving().toIndexedPixels();
  if (!indexed) {
    alert(BRUSH_TRUE_COLOR_REFUSAL);
    return null;
  }
  const { mime } = brushSaveFormats.iff.fileType;
  return async () =>
    new Blob(
      [
        encodeIlbm({
          width: brush.width,
          height: brush.heigth,
          palette: plainPalette(palette),
          pixels: indexed.pixels,
          transparentColor: indexed.transparentColor,
          // Where the brush is actually held (docs/brush-handle.md), which is
          // what DPaint wrote too — curbr.xoffs straight into the chunk
          // (DPIO.C:250). The resting handle rather than handle(), so saving
          // while a transform tool is armed records the brush, not the drag.
          // Floored: GRAB is whole pixels and a centred handle is a half.
          grab: {
            x: Math.floor(brush.restingHandle().x),
            y: Math.floor(brush.restingHandle().y),
          },
        }) as BlobPart,
      ],
      { type: mime }
    );
}
