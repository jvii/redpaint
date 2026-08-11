import { Context } from '../../overmind';
import { countDistinctColors, distinctOpaqueColorsByFrequency } from '../../algorithm/imageColors';
import { setPendingImage } from '../../canvas/pendingImage';
import { setPendingBrush } from '../../canvas/pendingBrush';
import { decodeIlbm, IlbmError } from '../../fileformat/ilbm';
import { decodeGif, GifError } from '../../fileformat/gif';
import { CanvasColorIndex } from '../../domain/CanvasColorIndex';
import { setPendingCanvasContent } from '../../canvas/pendingCanvasContent';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import {
  DEFAULT_SCREEN_FORMAT_ID,
  DEFAULT_TRUE_COLOR_ENABLED,
  DEFAULT_VIDEO_STANDARD,
  findMatchingScreenFormat,
  nativeCanvasSize,
} from '../canvas/state';
import {
  DEFAULT_BACKGROUND_COLOR_ID,
  DEFAULT_FOREGROUND_COLOR_ID,
  defaultPaletteColors,
  defaultRanges,
} from '../palette/state';
import { cycleRangesToPaletteRanges } from '../../algorithm/paletteRange';
import { storeUiScale } from '../../uiScale';
import { Drawer } from './state';
import { SaveFormat } from '../../components/menu/saveFormats';

export const imageFileToPasteBuffer = (context: Context, imageFile: File): void => {
  context.state.app.pasteBufferImageObjectURL = URL.createObjectURL(imageFile);
};

// Starts an image load: decode the file, take stock of it (size, distinct
// colors), and open the requester that asks how to treat its colors. The
// pixels wait in canvas/pendingImage.ts for the requester's answer; the URL
// is consumed (revoked) here either way. Both Image > Open and "Paste as new
// image" come through this.
// A loaded file names the document, as opening a file does in any editor.
// Without its extension, so the name can be offered to either save format.
function documentNameFrom(fileName: string): string {
  return fileName.replace(/\.[^./\\]+$/, '');
}

export const beginImageLoad = async (
  context: Context,
  { url, fileName }: { url: string; fileName?: string }
): Promise<void> => {
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

    // The name rides with the pixels rather than sitting in state: nothing
    // renders it, the requester's OK just passes it through, and it belongs
    // with the rest of the payload waiting for that answer.
    setPendingImage(imageData, fileName ? documentNameFrom(fileName) : '');
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
    context.state.palette.ranges = cycleRangesToPaletteRanges(image.cycleRanges);
    // the GL palette textures don't watch Overmind — push the new palette
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();

    const colorIndex = CanvasColorIndex.fromIndexedPixels(image.width, image.height, image.pixels);
    // the canvas resizes to the image; the resolution effect uploads the
    // queued content once the resize commits and resets undo history to it
    setPendingCanvasContent(colorIndex, {
      freshDocument: true,
      documentName: documentNameFrom(file.name),
    });
    context.actions.canvas.setResolution({
      width: image.width,
      height: image.height,
      recordUndoPoint: false,
    });

    // If the image happens to be an exact standard Amiga screen size, select
    // that screen format (cosmetic only — the canvas is already that exact
    // size, so no resize/palette conform is needed, unlike the requester's
    // own OK). A non-matching size (or an arbitrary previous document's
    // format) falls back to Native rather than leaving a stale format set.
    const match = findMatchingScreenFormat(image.width, image.height);
    context.actions.canvas.setScreenFormat({ formatId: match?.id ?? null });
    if (match) {
      context.actions.canvas.setVideoStandard(match.standard);
    }
  } catch (error) {
    alert(
      error instanceof IlbmError
        ? `Failed to open IFF file: ${error.message}`
        : 'Failed to open file!'
    );
  } finally {
    context.actions.app.setLoading(false);
  }
};

// Opens a GIF. Like an ILBM and unlike a PNG, it goes nowhere near the color
// treatment requester: a GIF is always indexed — the format has no other kind —
// so it arrives with the palette it was written with, and the indices are
// already what the canvas stores.
//
// That is the whole reason for decoding it ourselves rather than letting
// drawImage do it. The browser hands back RGBA, which would send a picture that
// is *already* palette-indexed through countDistinctColors and quantize to have
// its palette guessed back out of the pixels — losing slot order and every slot
// the picture happens not to use.
//
// An animation loads as its first frame. This is a paint program, and one frame
// is the only answer that produces a picture; decodeGif counts the rest.
export const beginGifLoad = async (context: Context, file: File): Promise<void> => {
  context.actions.app.setLoading(true);
  try {
    const image = decodeGif(new Uint8Array(await file.arrayBuffer()));

    context.actions.canvas.setTrueColorEnabled(false);
    context.actions.palette.replacePalette(image.palette);
    // the GL palette textures don't watch Overmind — push the new palette
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();

    const colorIndex = CanvasColorIndex.fromIndexedPixels(image.width, image.height, image.pixels);
    setPendingCanvasContent(colorIndex, {
      freshDocument: true,
      documentName: documentNameFrom(file.name),
    });
    context.actions.canvas.setResolution({
      width: image.width,
      height: image.height,
      recordUndoPoint: false,
    });

    // Same cosmetic screen-format match as an ILBM load: an image that happens
    // to be a standard Amiga size selects that format, anything else Native.
    const match = findMatchingScreenFormat(image.width, image.height);
    context.actions.canvas.setScreenFormat({ formatId: match?.id ?? null });
    if (match) {
      context.actions.canvas.setVideoStandard(match.standard);
    }
  } catch (error) {
    alert(
      error instanceof GifError ? `Failed to open GIF: ${error.message}` : 'Failed to open file!'
    );
  } finally {
    context.actions.app.setLoading(false);
  }
};

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

// The opposite: there are changes no file has. Zero rather than a flag, so it
// compares against the undo timestamps the same way markDocumentClean's does.
export const markDocumentModified = (context: Context): void => {
  context.state.app.lastCleanTime = 0;
};

// The document now matches a file (or is a fresh, empty one): nothing to save.
export const markDocumentClean = (context: Context): void => {
  context.state.app.lastCleanTime = Date.now();
};

// DPaint's CLR: cover the page with the background color, and nothing else.
// Pixels only, so undo puts back exactly what this took away — it does not drop
// the document's name or mark it clean, which would make it half a new page
// (that is `newPicture` below).
//
// An action rather than the two lines inline in the gadget, now that the K
// hotkey wants the same thing. Two copies of "clear, then take an undo point"
// is exactly the pair that drifts, and the half that gets forgotten is the
// undo point — which fails silently and only shows up as an undo that skips a
// step.
export const clearPage = (context: Context): void => {
  paintingCanvasController.clear();
  context.actions.undo.setUndoPoint();
};

// A fresh page: the canvas fitted to the window again, the startup palette
// back, and the document no longer standing for any file. Right-click on CLR,
// where left-click covers the page with the background color and nothing more.
//
// It exists because the autosave took a gesture away. Reloading used to give a
// clean slate — not by design, but because nothing was kept — and now that the
// picture comes back, there was no way to start over at all. DPaint had no New
// either (its File menu begins at Load Picture); CLR was how you started again,
// with page size and palette carried over as properties of the session. So this
// is that gesture made deliberate rather than a menu item DPaint never had.
//
// Undoable, unlike a load, which drops history. An undo entry already carries
// the palette and the dimensions as well as the pixels, so one step puts all
// three back — and a right-click that lands here by accident (the gadget above
// is UNDO, whose right-click is redo) costs nothing.
//
// Precisely: undo restores the picture — pixels, canvas size and palette, all
// three of which a snapshot carries. It does not restore the document's name,
// nor the screen format, video standard and True Color switch, none of which
// are in one. So undoing a new page gives the painting back on a Native canvas
// of its old size, untitled.
//
// That is a deliberate line rather than an oversight: a snapshot is what the
// picture looked like, and making undo move the tab title or flip the simulated
// screen underneath someone would be its own surprise. If it ever needs to be
// exact, the fix is to widen UndoEntry, not to special-case this action.
export const newPicture = (context: Context): void => {
  // The simulated screen goes first, and back to none. Fitting the canvas to
  // the window is only meaningful at Native: leaving a format selected would
  // set a Lo-Res document to a window-sized canvas, which is a state no route
  // through the Screen Format requester can produce. The video standard and
  // the True Color switch travel with it — the autosave record carries all
  // three together, which is the app's own statement that they belong to the
  // picture rather than to the session.
  context.actions.canvas.setScreenFormat({ formatId: DEFAULT_SCREEN_FORMAT_ID });
  context.actions.canvas.setVideoStandard(DEFAULT_VIDEO_STANDARD);
  context.actions.canvas.setTrueColorEnabled(DEFAULT_TRUE_COLOR_ENABLED);

  // Palette next: the GL textures index into it, and the snapshot taken below
  // records whichever palette is current.
  context.actions.palette.replacePalette(defaultPaletteColors());
  context.actions.palette.replaceRanges(defaultRanges());
  // And the slots selected in it. Without this the ids survive the palette
  // swap — replacePalette only clamps them into the new depth — so a page
  // would be filled with the default palette's color at whatever slot the old
  // background happened to sit in: coherent only by accident, and arbitrary to
  // anyone who had chosen a background. Back on color 1, black in every DPaint
  // default palette, which is the page a fresh start begins with.
  // setForegroundColor also drops any literal RGB foreground.
  context.actions.palette.setForegroundColor(DEFAULT_FOREGROUND_COLOR_ID);
  context.actions.palette.setBackgroundColor(DEFAULT_BACKGROUND_COLOR_ID);
  paintingCanvasController.updatePalette();
  overlayCanvasController.updatePalette();

  // The drawing pane's size, which is what the canvas is fitted to at startup;
  // its own resolution if the pane has somehow never been measured.
  const size = nativeCanvasSize(context.state.canvas);

  // Queued rather than cleared here, and the undo point taken by the upload:
  // setResolution's canvas element resize only commits on the next render, so
  // a snapshot taken now would be of the old size (see useCanvasContentUpload).
  const backgroundColorNumber = Number(context.state.palette.backgroundColorId);
  setPendingCanvasContent(
    CanvasColorIndex.createEmptyWithBackgroundColor(size.width, size.height, backgroundColorNumber),
    { freshDocument: true, keepHistory: true, documentName: '', documentModified: false }
  );
  context.actions.canvas.setResolution({
    width: size.width,
    height: size.height,
    recordUndoPoint: false,
  });
};

// Remembered from Save As, repeated by Save.
export const setSaveFormat = (context: Context, format: SaveFormat): void => {
  context.state.app.saveFormat = format;
};

export const setDocumentName = (context: Context, name: string): void => {
  context.state.app.documentName = name;
};

// The name to offer, extension included — the requester splits it, since which
// part is the extension follows from the string itself.
export const openSaveAsPrompt = (context: Context, suggested: string): void => {
  context.state.app.saveAsPrompt = suggested;
};

export const closeSaveAsPrompt = (context: Context): void => {
  context.state.app.saveAsPrompt = null;
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

// The drawers are a radio group (Menu.tsx) — opening one closes the others,
// and clicking the open one again collapses it.
export const toggleDrawer = (context: Context, drawer: Drawer): void => {
  context.state.app.openDrawer = context.state.app.openDrawer === drawer ? null : drawer;
};

// The chrome scale (uiScale.ts). The --ui-scale custom property the CSS
// actually reads is written by App.tsx watching this value, so the DOM write
// stays out of the action and startup goes through the same path.
export const setUiScale = (context: Context, scale: number): void => {
  context.state.app.uiScale = scale;
  storeUiScale(scale);
};
