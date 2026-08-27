import { Context } from '../../overmind';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import {
  hasPendingCanvasContent,
  setPendingCanvasContent,
} from '../../canvas/pendingCanvasContent';
import { plainPalette } from '../../algorithm/imageColors';
import {
  createNearestMapper,
  extractExactPalette,
  medianCutPalette,
} from '../../algorithm/quantize';
import { countDistinctColors, paletteEquals } from '../../algorithm/imageColors';
import { createPalette } from '../../components/palette/util';
import { CropRect } from '../crop/state';
import { Color } from '../../types';
import { Point } from '../../types';
import { PendingScreenFormat, ScreenFormatId, VideoStandard } from './state';
import { CanvasColorIndex } from '../../domain/CanvasColorIndex';
import { syncBufferSize } from '../undo/actions';
import {
  conformParkedPages,
  currentPageIndex,
  dropParkedPages,
  pageCount,
  parkedPageRasters,
} from '../pages/PageStore';

type Resolution = { width: number; height: number };

export interface SetResolutionParams extends Resolution {
  // Whether the freshly initialized (empty) canvas becomes a history entry.
  // True for a bare resize (startup sizing the canvas to the window); false
  // when content is queued to follow (image load, content-preserving resize,
  // undo restore). There the upload effect owns the history, and recording here
  // would plant a blank artifact entry the user then undoes onto.
  recordUndoPoint?: boolean;
}

export const setResolution = (
  context: Context,
  { width, height, recordUndoPoint = true }: SetResolutionParams
): void => {
  const current = context.state.canvas.resolution;
  if (current.width !== width || current.height !== height) {
    // The zoom view was aimed at a point on a canvas that no longer exists.
    // Close it rather than leave it parked on whatever pixel that coordinate
    // now happens to be.
    context.state.toolbox.zoomModeOn = false;
    context.state.canvas.zoomFocusPoint = null;
  }
  context.state.canvas.resolution = { width, height };
  paintingCanvasController.init();
  if (recordUndoPoint) {
    context.actions.undo.setUndoPoint();
  }
};

// Both resize the canvas to a new size, keeping the existing content instead of
// clearing; the new content is queued and uploaded by the resolution effect
// once the canvas element resize commits (the path an own-size image load uses).
// Scaling stretches the content to the new size; placing keeps it 1:1 in the
// top-left, padding with the background and cropping any overflow.
export const resizeCanvasScalingContent = (
  context: Context,
  { width, height }: Resolution
): void => {
  const current = paintingCanvasController.getCanvasColorIndex();
  if (current && current.width > 0 && current.height > 0) {
    setPendingCanvasContent(current.resizedTo(width, height));
  }
  context.actions.canvas.setResolution({ width, height, recordUndoPoint: false });
};

export const resizeCanvasPlacingContent = (
  context: Context,
  { width, height }: Resolution
): void => {
  const current = paintingCanvasController.getCanvasColorIndex();
  if (current && current.width > 0 && current.height > 0) {
    const backgroundColorNumber = Number(context.state.palette.backgroundColorId);
    setPendingCanvasContent(current.placedInto(width, height, backgroundColorNumber));
  }
  context.actions.canvas.setResolution({ width, height, recordUndoPoint: false });
};

// Resizes to the given size with a blank canvas. The counterpart to
// resizeCanvasPlacingContent when a screen-format change is not keeping the
// picture. Queued, not cleared on the spot: the element resize only commits on
// the next render, so a snapshot taken now would be of the old size, and the
// upload is what records the single undo entry. Called with the current size
// too, for a format that does not resize.
export const resizeCanvasClearingContent = (
  context: Context,
  { width, height }: Resolution
): void => {
  const backgroundColorNumber = Number(context.state.palette.backgroundColorId);
  setPendingCanvasContent(
    CanvasColorIndex.createEmptyWithBackgroundColor(width, height, backgroundColorNumber)
  );
  context.actions.canvas.setResolution({ width, height, recordUndoPoint: false });
};

// Keeps just the given canvas-coordinate rectangle: the crop counterpart of
// resizeCanvasPlacingContent, on the same pending-content path, so it lands as
// one undo entry that restores the pre-crop size along with the pixels.
export const cropCanvas = (context: Context, rect: CropRect): void => {
  const current = paintingCanvasController.getCanvasColorIndex();
  if (current && current.width > 0 && current.height > 0) {
    const backgroundColorNumber = Number(context.state.palette.backgroundColorId);
    setPendingCanvasContent(current.croppedTo(rect, backgroundColorNumber));
  }
  context.actions.canvas.setResolution({
    width: rect.width,
    height: rect.height,
    recordUndoPoint: false,
  });
};

// Holds a screen format change that hasn't been applied yet, while the shrink
// question is up (see pendingScreenFormat).
export const setPendingScreenFormat = (
  context: Context,
  pending: PendingScreenFormat | null
): void => {
  context.state.canvas.pendingScreenFormat = pending;
};

export interface SetScreenFormatParams {
  formatId: ScreenFormatId | null;
}

// Applies only which screen is simulated. Scaling it into the window is an
// independent view preference (toggleScaleMode), and resizing the canvas to the
// screen is a separate, conditional step (the Screen Format requester).
export const setScreenFormat = (context: Context, { formatId }: SetScreenFormatParams): void => {
  context.state.canvas.screenFormatId = formatId;
};

// Which broadcast standard the 4 named formats' dimensions resolve to. Set
// directly by an ILBM load auto-matching a standard Amiga size, which is
// cosmetic. The canvas is already that size. The requester instead commits it
// through applyScreenFormat, as part of one choice.
export const setVideoStandard = (context: Context, standard: VideoStandard): void => {
  context.state.canvas.videoStandard = standard;
};

// How the simulated screen fills the window. Independent of the format and
// meaningless for Native, so it lives outside the Screen Format requester: a
// menu toggle owns it (ScreenStatus.tsx).
export const toggleScaleMode = (context: Context): void => {
  context.state.canvas.scaleMode =
    context.state.canvas.scaleMode === 'aspect' ? 'stretch' : 'aspect';
};

// Mirrors MainCanvas's own locally computed displayScale into Overmind state:
// see state.ts's displayScale comment for why.
export const setDisplayScale = (context: Context, scale: Point): void => {
  context.state.canvas.displayScale = scale;
};

export const setViewportSize = (
  context: Context,
  size: { width: number; height: number }
): void => {
  context.state.canvas.viewportSize = size;
};

// The area the pane sits in, tracked alongside it: see paneAreaSize's comment.
export const setPaneAreaSize = (
  context: Context,
  size: { width: number; height: number }
): void => {
  context.state.canvas.paneAreaSize = size;
};

// The one automatic sizing: a Native canvas fitted to the drawing pane at
// startup. MainCanvas may call it more than once while the chrome settles, so
// it resets the history rather than appending: two baseline entries read as
// "painted on" to everything downstream, the autosave included.
//
// Refuses once the size is no longer its to decide: a screen format driving it,
// anything having named the document, or more history than the baseline.
export const setStartupResolution = (context: Context, { width, height }: Resolution): void => {
  const current = context.state.canvas.resolution;
  if (width <= 0 || height <= 0 || (width === current.width && height === current.height)) {
    return;
  }
  if (context.state.canvas.screenFormatId !== null) {
    return; // a format owns the size; this is the Native path only
  }
  // Content queued but not yet uploaded. A restored autosave or a load, whose
  // resize is what woke the observer that called this. The state below still
  // describes the blank startup canvas for another tick, so the fit would
  // otherwise re-init the canvas out from under the upload.
  if (hasPendingCanvasContent()) {
    return;
  }
  const { lastUndoPointTime, lastUndoRedoTime, bufferEntryCount } = context.state.undo;
  const painted = Math.max(lastUndoPointTime, lastUndoRedoTime) > context.state.app.lastCleanTime;
  if (context.state.app.documentName !== '' || bufferEntryCount > 1 || painted) {
    return; // no longer a blank startup canvas
  }
  context.actions.undo.reset();
  context.actions.canvas.setResolution({ width, height });
  // An empty canvas nobody has painted on is not unsaved work. After the
  // baseline snapshot setResolution just took, not before it.
  context.actions.app.markDocumentClean();
};

// Loading an image as True Color opts the new document back into true color;
// the Screen Format requester's switch goes through applyScreenFormat instead
// (turning it off there also conforms the pixels).
export const setTrueColorEnabled = (context: Context, enabled: boolean): void => {
  context.state.canvas.trueColorEnabled = enabled;
};

// Where a color reduction takes its palette from: keep the current colors
// (truncation, surviving slots unchanged, dropped ones remapped) or rebuild an
// optimal palette from the image itself (exact when the image's distinct colors
// fit the depth, median cut otherwise).
export type PaletteSource = 'current' | 'image';

export interface ApplyScreenFormatParams extends SetScreenFormatParams {
  videoStandard: VideoStandard;
  colors: number;
  trueColorEnabled: boolean;
  paletteSource: PaletteSource;
  // Whether the picture survives. False means the caller is about to replace
  // it with a blank canvas, so there is nothing to conform and nothing to
  // extract a palette from.
  retainPicture: boolean;
}

// Commits a screen format choice: palette depth, simulated screen and True
// Color mode, then pushes the palette into the GL textures (which don't watch
// Overmind) and conforms the canvas pixels to it. Switching True Color off
// flattens true-color pixels. The canvas resize, if any, is the caller's
// separate step. Both the requester and the shrink question commit through
// here, so a deferred change applies exactly like an immediate one.
export const applyScreenFormat = (
  context: Context,
  {
    formatId,
    videoStandard,
    colors,
    trueColorEnabled,
    paletteSource,
    retainPicture,
  }: ApplyScreenFormatParams
): boolean => {
  // The raw map, never the paletteArray derived: this action mutates the
  // palette and reads it back, which is exactly where a stale derived does its
  // damage (docs/gotchas.md, "Overmind").
  const oldPalette = plainPalette(Object.values(context.state.palette.palette));
  const flatten = !trueColorEnabled && context.state.canvas.hasTrueColorPixels;
  // Read before the switch below is applied. The flag above is about the page
  // on screen (whether *it* holds any true-color pixels); this one is about the
  // document, and so is what the other pages have to answer to.
  const trueColorTurnedOff = context.state.canvas.trueColorEnabled && !trueColorEnabled;
  const depthShrunk = colors < oldPalette.length;
  // Whether this change touches pixels at all, asked of the *document*: a depth
  // reduction remaps indices, and True Color going off flattens whatever holds
  // true-color pixels — which may be a page that is not on screen. Reading it
  // off `flatten` alone asked only about the visible page, so a document whose
  // true-color pixels were all on the spare took neither the rebuild below nor
  // the conform.
  //
  // False when the picture is not being kept: the caller replaces it with a
  // blank canvas straight after, so remapping first would be work whose only
  // result is thrown away.
  const conforming = retainPicture && (depthShrunk || trueColorTurnedOff);

  // A rebuilt palette comes from the image as displayed: resolve the canvas
  // to RGB, then take its own colors outright when they fit the depth
  // (lossless), or the median cut when they don't.
  //
  // From *every* page, not just the one on screen. They share the palette, so
  // they all have a claim on what is in it, and building it from the visible
  // page alone hands the others a palette that never saw their colors. Two
  // true-color pages, blues on one and reds on the other, reduced to 8: the
  // palette came out as three blues and five slots of black padding, and the
  // reds flattened to black — destroyed, with room to spare that would have
  // held them exactly.
  let rebuilt: Color[] | null = null;
  if (conforming && paletteSource === 'image') {
    const current = paintingCanvasController.getCanvasColorIndex();
    if (current) {
      const rgba = combinedRGBA(
        [current, ...parkedPageRasters()].map(
          (raster): Uint8ClampedArray => raster.resolveToRGBA(oldPalette)
        )
      );
      // Spare slots go to the colors already to hand rather than to black: a
      // two-color picture conformed to sixteen should leave a palette somebody
      // can go on painting with. The current palette first, since those are the
      // colors this document chose, then the depth's own default to make up any
      // shortfall when the palette is growing.
      rebuilt =
        countDistinctColors(rgba) <= colors
          ? extractExactPalette(rgba, colors, [
              ...oldPalette,
              ...Object.values(createPalette(colors)),
            ])
          : medianCutPalette(rgba, colors);
    }
  }

  if (rebuilt) {
    context.actions.palette.replacePalette(rebuilt);
  } else {
    context.actions.palette.setNumberOfColors(colors);
  }
  context.actions.canvas.setScreenFormat({ formatId });
  context.state.canvas.videoStandard = videoStandard;
  context.state.canvas.trueColorEnabled = trueColorEnabled;
  paintingCanvasController.updatePalette();
  overlayCanvasController.updatePalette();

  // "Keep the picture?" is a question about the document, and the pages are part
  // of it: answering no puts a blank canvas on this page and takes the others
  // with it, rather than leaving a page of the old picture's material behind
  // the `j` key. The only route here with retainPicture false is the
  // requester's own discard branch (ScreenFormatDialog), where the user has
  // just chosen exactly that.
  if (!retainPicture) {
    dropParkedPages();
    context.state.pages.currentPageIndex = currentPageIndex();
    context.state.pages.pageCount = pageCount();
    // the freed histories were counted in the shared total until now
    syncBufferSize(context);
  } else if (conforming) {
    // Kept, so every page comes along: they all index into this palette, by
    // decree of the DPaint II manual, and the ones off screen hold nothing but
    // their history's current entry, which nothing else in the app will touch.
    const newPalette = rebuilt ?? plainPalette(Object.values(context.state.palette.palette));
    const mapper = createNearestMapper(newPalette);
    conformParkedPages(
      (colorIndex): CanvasColorIndex =>
        colorIndex.conformedTo(
          oldPalette,
          newPalette,
          trueColorTurnedOff,
          rebuilt !== null,
          mapper
        ),
      newPalette
    );
  }

  // Conform without recording history: the caller commits exactly one undo
  // entry for the whole change (via its resize's upload, or setUndoPoint for a
  // same-size change), so undo restores the full pre-change canvas. Returns
  // whether the pixels changed, so the caller knows an entry is owed.
  // The page on screen conforms when anything changed for *it*: a narrower
  // palette, true-color pixels of its own to flatten, or a rebuilt palette its
  // indices no longer mean the same against. That last one is why this cannot
  // simply be `conforming`: a rebuild triggered by another page's pixels still
  // moves every color this page indexes.
  if (conforming && (depthShrunk || flatten || rebuilt !== null)) {
    const current = paintingCanvasController.getCanvasColorIndex();
    if (current) {
      // `rebuilt` when there is one: it is the palette just installed.
      const newPalette = rebuilt ?? plainPalette(Object.values(context.state.palette.palette));
      const conformed = current.conformedTo(
        oldPalette,
        newPalette,
        flatten,
        rebuilt !== null, // every slot changed — all indexed pixels remap
        createNearestMapper(newPalette)
      );
      paintingCanvasController.setCanvasColorIndex(conformed);
      paintingCanvasController.render();
      return true;
    }
  }
  return false;
};

export const setScrollFocusPoint = (context: Context, point: Point): void => {
  context.state.canvas.scrollFocusPoint = point;
};

export const setZoomFocusPoint = (context: Context, point: Point | null): void => {
  context.state.canvas.zoomFocusPoint = point;
  if (point != null) {
    context.state.toolbox.zoomModeOn = true;
    context.state.toolbox.selectedSelectorToolId = null;
  }
};

// One buffer for the quantizers, which take a single RGBA array. Returns the
// only buffer untouched when there is one, so the common case of a single page
// costs no copy.
function combinedRGBA(buffers: Uint8ClampedArray[]): Uint8ClampedArray {
  if (buffers.length === 1) {
    return buffers[0];
  }
  const combined = new Uint8ClampedArray(buffers.reduce((total, one) => total + one.length, 0));
  let at = 0;
  for (const buffer of buffers) {
    combined.set(buffer, at);
    at += buffer.length;
  }
  return combined;
}

// DPaint II's Picture > Color Control trio, the picture-wide twins of the brush
// ones in the Brush drawer (docs/brush-palette.md). Two differences follow from
// the subject rather than the operation: a picture has no transparency, so
// Bg -> Fg is a plain color substitution rather than a filling of holes; and
// these change pixels, so each takes an undo point where the brush versions
// bank for Restore.
//
// The current page only, as every drawing operation is. The Spare is a separate
// picture, not part of this one.
const editCurrentPage = (
  context: Context,
  edit: (colorIndex: CanvasColorIndex) => CanvasColorIndex
): void => {
  const current = paintingCanvasController.getCanvasColorIndex();
  if (!current) {
    return;
  }
  paintingCanvasController.setCanvasColorIndex(edit(current));
  // setCanvasColorIndex only uploads the texture; nothing draws until asked, as
  // the undo path does after its own restore (components/canvas/hooks.tsx).
  paintingCanvasController.render();
  context.actions.undo.setUndoPoint();
};

export const pictureBackgroundToForeground = (context: Context): void => {
  const background = Number(context.state.palette.backgroundColorId);
  const foreground = Number(context.state.palette.foregroundColorId);
  if (background === foreground) {
    return;
  }
  editCurrentPage(context, (c) => c.withColorReplaced(background, foreground));
};

export const pictureSwapBackgroundAndForeground = (context: Context): void => {
  const background = Number(context.state.palette.backgroundColorId);
  const foreground = Number(context.state.palette.foregroundColorId);
  if (background === foreground) {
    return;
  }
  editCurrentPage(context, (c) => c.withColorsSwapped(background, foreground));
};

// Re-index the picture from the palette it was painted under into the current
// one, so it keeps its colors rather than its slots — the other way out of a
// palette change from Restore, which puts the old palette back instead.
//
// The source is picturePalette, what the pixels mean, which the DP2 manual
// describes as "the colors it used in the original palette". Not the palette
// Restore remembers: that one is only written by From Brush and Default, and the
// manual's own example is a hand edit, which writes neither.
//
// conformedTo with remapAll does the work; it is what a screen conform already
// uses to bring a picture onto a rebuilt palette. Plain nearest, not the greedy
// exclusive assignment the brush remap uses: a picture has far more colors than
// slots to be exclusive about.
export const remapPictureToPalette = (context: Context): void => {
  const from = plainPalette(context.state.palette.picturePalette);
  const to = plainPalette(Object.values(context.state.palette.palette));
  if (paletteEquals(from, to)) {
    return;
  }
  const nearest = createNearestMapper(to);
  // Before the edit, because editCurrentPage takes the undo point: set after,
  // the entry would record the re-indexed pixels as still meaning the palette
  // they were just moved off, and a redo onto it would report a mismatch that
  // is not there. (Re-indexing is what makes the pixels mean the new palette —
  // DPaint overwrites LoadBrColors at the end of the brush remap for the same
  // reason.)
  context.state.palette.picturePalette = to;
  editCurrentPage(context, (c) => c.conformedTo(from, to, false, true, nearest));
};
