import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { cycleDriver } from '../../canvas/CycleDriver';
import { encodeIlbm } from '../../fileformat/ilbm';
import { encodeGif } from '../../fileformat/gif';
import { plainPalette } from '../../algorithm/imageColors';
import { Color } from '../../types';
import { PaletteRange } from '../../overmind/palette/state';
import { canvasPngBlob, SaveFileType } from './saveAsPng';

// The formats a picture can be written as, in one place, because the choice is
// now the user's rather than a consequence of which gadget was clicked. Save As
// asks; Save repeats the answer.
export type SaveFormat = 'png' | 'iff' | 'gif';

export const SAVE_FORMATS: SaveFormat[] = ['png', 'iff', 'gif'];

export type SaveFormatSpec = {
  // What the requester calls it. The parenthetical is the part that matters:
  // it is the only place the app says which formats keep the palette and which
  // flatten it, and that is the whole basis for choosing between them.
  label: string;
  note: string;
  fileType: SaveFileType;
};

export const saveFormats: { [format in SaveFormat]: SaveFormatSpec } = {
  png: {
    label: 'PNG',
    note: 'True color. Read anywhere; the indexed palette is not kept.',
    fileType: { description: 'PNG image', mime: 'image/png', extension: '.png' },
  },
  iff: {
    label: 'IFF',
    note: 'Indexed. Amiga ILBM — keeps the indexed palette and the cycle ranges.',
    fileType: { description: 'IFF ILBM image', mime: 'image/x-ilbm', extension: '.iff' },
  },
  gif: {
    label: 'GIF',
    note: 'Indexed. Keeps the indexed palette; read anywhere.',
    fileType: { description: 'GIF image', mime: 'image/gif', extension: '.gif' },
  },
};

// Whether the indexed formats can hold what is on the canvas. Asked by the
// requester so IFF and GIF can be greyed out with a reason, rather than
// accepted and then refused by an alert once the choice has been made.
//
// Not the True Color *switch*: that is a mode, and a picture painted entirely
// in palette colors with the switch on is perfectly indexable. This is a scan
// of the pixels, memoized on the snapshot and early-exiting on the first
// true-color pixel, so the common answer is cheap.
export function pictureIsIndexed(): boolean {
  return paintingCanvasController.getCanvasColorIndex()?.hasTrueColorPixels() === false;
}

// Why an indexed format cannot write this picture. Still checked at save time
// even though the requester now disables those options: the two gadgets are
// not the only way in (a remembered format meets a picture that has changed
// since), and a wrong answer here writes a corrupt file rather than nagging.
const TRUE_COLOR_REFUSAL =
  'The picture has True Color pixels, and this format stores palette-indexed ' +
  'pixels only. Save as PNG, or turn True Color off in Screen Format first.';

export type BlobMaker = () => Promise<Blob | null>;

// Everything an indexed encoder needs, read once. Null when the picture has
// true-color pixels, which is the one thing neither can represent.
function indexedPicture(): { width: number; height: number; pixels: Uint8Array } | null {
  const colorIndex = paintingCanvasController.getCanvasColorIndex();
  const pixels = colorIndex?.toIndexedPixels();
  if (!colorIndex || !pixels) {
    return null;
  }
  return { width: colorIndex.width, height: colorIndex.height, pixels };
}

// Builds the thing that produces the bytes — deliberately not the bytes.
//
// saveFileAs calls it once the save picker has been through, which is the only
// point at which the bytes are certainly wanted. PNG additionally *has* to be
// captured there: it reads the drawing buffer, so it holds the base palette
// across the capture or a mid-cycle rotation is baked into the file. The
// indexed formats take their pixels from the color-index texture and their
// colors from state, neither of which cycling touches, so they only defer to
// avoid encoding for a save that gets cancelled.
//
// Returns null, having said why, when the picture cannot be written that way.
export function blobMakerFor(
  format: SaveFormat,
  palette: Color[],
  ranges: readonly (PaletteRange | null)[]
): BlobMaker | null {
  if (format === 'png') {
    return () =>
      cycleDriver.withBaseColors(async (): Promise<Blob | null> => {
        // preserveDrawingBuffer is on, but render once to be sure it is current
        paintingCanvasController.render();
        return canvasPngBlob(paintingCanvasController.mainCanvas)();
      });
  }

  // Read the canvas now, so the refusal happens before any requester goes up:
  // finding out a format cannot hold the picture is worth knowing before being
  // asked where to put it, not after. The *encoding* still waits — see below.
  const picture = indexedPicture();
  if (!picture) {
    alert(TRUE_COLOR_REFUSAL);
    return null;
  }
  const colors = plainPalette(palette);
  const { mime } = saveFormats[format].fileType;

  // Encoded inside the maker rather than here, so a picker the user backs out
  // of costs nothing: compressing a full canvas is real work, and the only
  // moment it is certainly wanted is once saveFileAs asks for the bytes.
  if (format === 'gif') {
    return async () =>
      new Blob([encodeGif({ ...picture, palette: colors }) as BlobPart], { type: mime });
  }

  const cycleRanges = ranges.flatMap((range) =>
    range
      ? [
          {
            low: Number(range.start) - 1,
            high: Number(range.end) - 1,
            rate: range.rate,
            active: range.active,
            reverse: range.reverse,
          },
        ]
      : []
  );
  return async () =>
    new Blob([encodeIlbm({ ...picture, palette: colors, cycleRanges }) as BlobPart], {
      type: mime,
    });
}
