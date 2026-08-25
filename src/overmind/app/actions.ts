import { Context } from '../../overmind';
import { currentPageIndex, dropParkedPages, pageCount } from '../pages/PageStore';
import { syncBufferSize } from '../undo/actions';
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
import { BrushSaveFormat } from '../../components/menu/brushSaveFormats';

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
    // after replacePalette. It clamps/keeps the previous document's ranges
    context.state.palette.ranges = cycleRangesToPaletteRanges(image.cycleRanges);
    // the GL palette textures don't watch Overmind: push the new palette
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
    // that screen format (cosmetic only; the canvas is already that exact size,
    // so no resize/palette conform is needed, unlike the requester's own OK). A
    // non-matching size (or an arbitrary previous document's format) falls back
    // to Native rather than leaving a stale format set.
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

// Opens a GIF, skipping the color-treatment requester as an ILBM does: a GIF is
// always indexed, so it arrives with its own palette and the indices the canvas
// stores. Decoded here rather than through drawImage, which hands back RGBA and
// would send an already-indexed picture through quantize to have its palette
// guessed back out of the pixels, losing slot order and unused slots.
//
// An animation loads as its first frame; decodeGif counts the rest.
export const beginGifLoad = async (context: Context, file: File): Promise<void> => {
  context.actions.app.setLoading(true);
  try {
    const image = decodeGif(new Uint8Array(await file.arrayBuffer()));

    context.actions.canvas.setTrueColorEnabled(false);
    context.actions.palette.replacePalette(image.palette);
    // the GL palette textures don't watch Overmind: push the new palette
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
// An IFF brush, which unlike a PNG one arrives indexed and carrying the palette
// it was saved under. Decoded here rather than through an <img>, which is what
// recovers the palette and the transparent color at all (docs/brush-save.md).
//
// The pixels are resolved to RGBA for the requester's preview, and the indexed
// form is kept beside them: which of the two the requester ends up using is the
// question it asks.
export const beginBrushIlbmLoad = async (context: Context, file: File): Promise<void> => {
  context.actions.app.setLoading(true);
  try {
    const image = decodeIlbm(new Uint8Array(await file.arrayBuffer()));
    const rgba = new Uint8ClampedArray(image.width * image.height * 4);
    for (let i = 0; i < image.pixels.length; i++) {
      const index = image.pixels[i];
      // A hole is transparent in the preview too, so it reads as a brush
      // rather than as a rectangle of background color.
      if (index === image.transparentColor) {
        continue;
      }
      const color = image.palette[index] ?? { r: 0, g: 0, b: 0 };
      rgba[i * 4] = color.r;
      rgba[i * 4 + 1] = color.g;
      rgba[i * 4 + 2] = color.b;
      rgba[i * 4 + 3] = 255;
    }
    const imageData = new ImageData(rgba, image.width, image.height);
    setPendingBrush(imageData, {
      palette: image.palette,
      pixels: image.pixels,
      transparentColor: image.transparentColor,
    });
    context.state.app.brushLoadInfo = {
      width: image.width,
      height: image.height,
      colorCount: distinctOpaqueColorsByFrequency(imageData.data).length,
    };
    context.actions.dialog.open('BRUSH_LOAD');
  } catch (error) {
    alert(error instanceof IlbmError ? error.message : 'Could not read that brush file.');
  } finally {
    context.actions.app.setLoading(false);
  }
};

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

// DPaint's CLR: cover the page with the background color and nothing else.
// Pixels only, so undo puts back exactly what it took. It does not drop the
// document's name or mark it clean, which would make it half a new page (that
// is `newPicture` below).
export const clearPage = (context: Context): void => {
  paintingCanvasController.clear();
  context.actions.undo.setUndoPoint();
};

// A fresh page: the canvas fitted to the window, the startup palette back, and
// the document no longer standing for any file. Right-click on CLR.
//
// Undoable, unlike a load. A snapshot carries pixels, canvas size and palette,
// so one step puts all three back, but not the document's name, nor the screen
// format, video standard and True Color switch, which are not in one. Undoing a
// new page therefore gives the painting back on a Native canvas of its old
// size, untitled. Making that exact means widening UndoEntry, not
// special-casing here.
export const newPicture = (context: Context): void => {
  // A fresh document is a fresh document: any other page goes with the old one,
  // rather than being left behind the `j` key holding the previous picture's
  // material. Not undoable, unlike the rest of this action — a page's history
  // is the page, so there is nothing left to step back into.
  dropParkedPages();
  context.state.pages.currentPageIndex = currentPageIndex();
  context.state.pages.pageCount = pageCount();
  // the freed histories were counted in the shared total until now
  syncBufferSize(context);

  // The simulated screen goes first, and back to none: fitting the canvas to
  // the window only means anything at Native, and leaving a format selected
  // would give a Lo-Res document a window-sized canvas, which no route through
  // the Screen Format requester can produce. The video standard and True Color
  // switch travel with it, as they do in the autosave record.
  context.actions.canvas.setScreenFormat({ formatId: DEFAULT_SCREEN_FORMAT_ID });
  context.actions.canvas.setVideoStandard(DEFAULT_VIDEO_STANDARD);
  context.actions.canvas.setTrueColorEnabled(DEFAULT_TRUE_COLOR_ENABLED);

  // The zoom view was aimed at a point on the picture being discarded, so it
  // goes with it — the same reasoning setResolution applies when a resize
  // invalidates the point. Here rather than there because a new picture may
  // happen to be the same size as the old one, and the zoom view surviving or
  // not should not turn on that.
  //
  // Not what fixes the canvas size, though it looks like it should: the pane
  // only widens once React has re-rendered and the observer has fired, both
  // after this action returns. nativeCanvasSize reads paneAreaSize for that
  // reason (canvas/state.ts).
  context.state.toolbox.zoomModeOn = false;
  context.state.canvas.zoomFocusPoint = null;

  // The brushes go with the picture they were cut from: every one of them holds
  // that picture's pixels, indexed into that picture's palette. Before the
  // palette below, so nothing is left pointing into the outgoing one.
  context.actions.brush.resetBrushes();

  // Palette next: the GL textures index into it, and the snapshot taken below
  // records whichever palette is current.
  context.actions.palette.replacePalette(defaultPaletteColors());
  context.actions.palette.replaceRanges(defaultRanges());
  // Nothing left to put back: what From Brush displaced belonged to the old
  // document, and its brush is gone too, so Restore goes dim with them.
  context.state.palette.previousPalette = null;
  // And the slots selected in it: replacePalette only clamps the ids into the
  // new depth, so without this the page would be filled with whatever color now
  // sits in the old background's slot. Back on color 1, black in every DPaint
  // default palette. setForegroundColor also drops any literal RGB foreground.
  context.actions.palette.setForegroundColor(DEFAULT_FOREGROUND_COLOR_ID);
  context.actions.palette.setBackgroundColor(DEFAULT_BACKGROUND_COLOR_ID);
  paintingCanvasController.updatePalette();
  overlayCanvasController.updatePalette();

  // The drawing pane's size, which is what the canvas is fitted to at startup;
  // its own resolution if the pane has somehow never been measured.
  const size = nativeCanvasSize(context.state.canvas);

  // Queued rather than cleared here, and the undo point taken by the upload:
  // setResolution's canvas element resize only commits on the next render, so a
  // snapshot taken now would be of the old size (see useCanvasContentUpload).
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

// A brush has nothing to repeat — it is never written back to a file it came
// from — so this is only what the requester opens on next time.
export const setBrushSaveFormat = (context: Context, format: BrushSaveFormat): void => {
  context.state.app.brushSaveFormat = format;
};

export const setDocumentName = (context: Context, name: string): void => {
  context.state.app.documentName = name;
};

// The name to offer, extension included. The requester splits it, since which
// part is the extension follows from the string itself.
export const openSaveAsPrompt = (context: Context, suggested: string): void => {
  context.state.app.saveAsPrompt = suggested;
};

export const closeSaveAsPrompt = (context: Context): void => {
  context.state.app.saveAsPrompt = null;
};

// Long enough to read two words without watching for them, short enough that
// the slot is back to the paint mode before anyone wonders why it is not.
const FLASH_MS = 1600;

let flashTimer: ReturnType<typeof setTimeout> | undefined;
// Rises on every flash, so the menu bar can key off it and replay the fade
// even when the same message repeats.
let flashId = 0;

export const flash = (context: Context, message: { name: string; value?: string }): void => {
  context.state.app.flash = { ...message, id: ++flashId };
  clearTimeout(flashTimer);
  flashTimer = setTimeout((): void => context.actions.app.clearFlash(), FLASH_MS);
};

export const clearFlash = (context: Context): void => {
  context.state.app.flash = null;
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

// The drawers are a radio group (Menu.tsx): opening one closes the others, and
// clicking the open one again collapses it.
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
