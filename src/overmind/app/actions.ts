import { Context } from '../../overmind';
import { countDistinctColors, distinctOpaqueColorsByFrequency } from '../../algorithm/imageColors';
import { setPendingImage } from '../../canvas/pendingImage';
import { setPendingBrush } from '../../canvas/pendingBrush';
import { decodeIlbm, IlbmCycleRange, IlbmError } from '../../fileformat/ilbm';
import { CanvasColorIndex } from '../../domain/CanvasColorIndex';
import { setPendingCanvasContent } from '../../canvas/pendingCanvasContent';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { PaletteRange } from '../palette/state';

export const imageFileToPasteBuffer = (context: Context, imageFile: File): void => {
  context.state.app.pasteBufferImageObjectURL = URL.createObjectURL(imageFile);
};

// Starts an image load: decode the file, take stock of it (size, distinct
// colors), and open the requester that asks how to treat its colors. The
// pixels wait in canvas/pendingImage.ts for the requester's answer; the URL
// is consumed (revoked) here either way. Both Image > Open and "Paste as new
// image" come through this.
export const beginImageLoad = async (context: Context, url: string): Promise<void> => {
  context.actions.app.setLoading(true);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject): void => {
      image.onload = (): void => resolve();
      image.onerror = (): void => reject(new Error('image decode failed'));
      image.src = url;
    });
    const decodeCanvas = document.createElement('canvas');
    decodeCanvas.width = image.width;
    decodeCanvas.height = image.height;
    const ctx = decodeCanvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    setPendingImage(imageData);
    context.state.app.imageLoadInfo = {
      width: image.width,
      height: image.height,
      colorCount: countDistinctColors(imageData.data),
    };
    context.actions.dialog.open('IMAGE_LOAD');
  } catch {
    alert('Failed to open file!');
  } finally {
    URL.revokeObjectURL(url);
    context.actions.app.setLoading(false);
  }
};

export const clearImageLoadInfo = (context: Context): void => {
  context.state.app.imageLoadInfo = null;
};

// Opens an IFF ILBM file. Unlike beginImageLoad there is no color-treatment
// requester: an ILBM is already indexed and carries its own palette (and
// DPaint never asked either). Commits through the same pipeline as the
// requester's OK: palette first, then the pixels via the resolution effect.
export const beginIlbmLoad = async (context: Context, file: File): Promise<void> => {
  context.actions.app.setLoading(true);
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = decodeIlbm(bytes);

    context.actions.canvas.setTrueColorEnabled(false);
    context.actions.palette.replacePalette(image.palette);
    // after replacePalette — it clamps/keeps the previous document's ranges
    context.state.palette.ranges = toPaletteRanges(image.cycleRanges);
    // the GL palette textures don't watch Overmind — push the new palette
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();

    const colorIndex = CanvasColorIndex.fromIndexedPixels(image.width, image.height, image.pixels);
    // the canvas resizes to the image; the resolution effect uploads the
    // queued content once the resize commits and resets undo history to it
    setPendingCanvasContent(colorIndex, { freshDocument: true });
    context.actions.canvas.setResolution({
      width: image.width,
      height: image.height,
      recordUndoPoint: false,
    });
  } catch (error) {
    alert(
      error instanceof IlbmError ? `Failed to open IFF file: ${error.message}` : 'Failed to open file!'
    );
  } finally {
    context.actions.app.setLoading(false);
  }
};

// DPaint's CRNG ranges map onto the palette's fixed four Range slots (color
// ids are 1-based where CRNG positions are 0-based). Rate and direction have
// no home yet — they return once color cycling is a feature.
function toPaletteRanges(cycleRanges: IlbmCycleRange[]): (PaletteRange | null)[] {
  const usable = cycleRanges.filter((r) => r.low < r.high).slice(0, 4);
  return [0, 1, 2, 3].map((i) =>
    usable[i] ? { start: String(usable[i].low + 1), end: String(usable[i].high + 1) } : null
  );
}

// Same as beginImageLoad, for brushes: Brush > Open... and "Paste as brush"
// both come through this. colorCount excludes transparent pixels (see
// distinctOpaqueColorsByFrequency) since they never occupy a palette slot.
export const beginBrushLoad = async (context: Context, url: string): Promise<void> => {
  context.actions.app.setLoading(true);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject): void => {
      image.onload = (): void => resolve();
      image.onerror = (): void => reject(new Error('image decode failed'));
      image.src = url;
    });
    const decodeCanvas = document.createElement('canvas');
    decodeCanvas.width = image.width;
    decodeCanvas.height = image.height;
    const ctx = decodeCanvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    setPendingBrush(imageData);
    context.state.app.brushLoadInfo = {
      width: image.width,
      height: image.height,
      colorCount: distinctOpaqueColorsByFrequency(imageData.data).length,
    };
    context.actions.dialog.open('BRUSH_LOAD');
  } catch {
    alert('Failed to open file!');
  } finally {
    URL.revokeObjectURL(url);
    context.actions.app.setLoading(false);
  }
};

export const clearBrushLoadInfo = (context: Context): void => {
  context.state.app.brushLoadInfo = null;
};

export const setLoading = (context: Context, isLoading: boolean): void => {
  context.state.app.isLoading = isLoading;
};

export const toggleMenu = (context: Context): void => {
  context.state.app.menuOpen = !context.state.app.menuOpen;
};

export const closeMenu = (context: Context): void => {
  context.state.app.menuOpen = false;
};

export const toggleBrushDrawer = (context: Context): void => {
  context.state.app.brushDrawerOpen = !context.state.app.brushDrawerOpen;
};
