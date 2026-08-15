import { Context } from '../../overmind';
import { CanvasColorIndex } from '../../domain/CanvasColorIndex';
import { plainPalette } from '../../algorithm/imageColors';
import { setPendingCanvasContent } from '../../canvas/pendingCanvasContent';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { createUndoEntry, toCanvasColorIndex, UndoBuffer, UndoEntry } from '../undo/UndoBuffer';
import { syncBufferSize } from '../undo/actions';
import {
  activateNextPage,
  addPage,
  currentHistory,
  currentPageIndex,
  nextPage,
  Page,
  pageCount,
  parkCurrentPage,
  removeCurrentPage,
} from './PageStore';

// DPaint's `j`: show the other page. Positional, never main-and-spare — see
// PageStore for why that distinction is the whole model.
//
// No new pipeline: queueing the arriving page's raster and then setting the
// resolution is the path a cross-size undo already takes (useUndo), and the
// upload effect runs it after React commits the canvas element resize. The
// raster costs no GPU readback either, because the page being left already has
// it in its history's current entry.
export const swap = (context: Context): void => {
  parkCurrentPage({
    currentIndex: context.state.undo.currentIndex,
    // Plain objects, not the Overmind proxies: these outlive the action, and a
    // proxy read outside one is the classic stale value (docs/gotchas.md).
    size: { ...context.state.canvas.resolution },
    backgroundColorId: context.state.palette.backgroundColorId,
    scrollFocusPoint: context.state.canvas.scrollFocusPoint
      ? { ...context.state.canvas.scrollFocusPoint }
      : null,
  });
  if (!nextPage()) {
    addPage(blankPage(context));
  }
  const target = nextPage() as Page;
  if (!target.history.getItem(target.currentIndex)) {
    // Cannot happen: a page is created with a blank entry and its history is
    // only ever cleared by a reset that records one. Checked before the index
    // moves, so a swap that cannot land does not happen at all.
    console.warn('pages.swap: the next page has no history entry');
    return;
  }
  activateNextPage();
  showCurrentPage(context, target);
};

// DPaint's Copy To Spare: the visible page onto the other one, which is what
// makes the other page a place to try something without risking the picture.
//
// Positional like everything else here, so from page two it copies onto page
// one — DPaint's own behaviour, and the reason this needs no case of its own.
// Recorded as an undo point on the *destination*, since it destroys whatever
// was there; that requirement is why per-page histories are not optional.
export const copyToSpare = (context: Context): void => {
  const source = currentEntry(context);
  if (!source) {
    console.warn('pages.copyToSpare: nothing to copy');
    return;
  }
  if (!nextPage()) {
    addPage(blankPage(context));
  }
  const target = nextPage() as Page;
  // Its own copy of the bytes. Entries are immutable and sharing one would
  // work, but it would be counted twice against the shared byte budget and
  // would quietly couple two pages' rasters together for whoever changes that
  // assumption later.
  const copy: UndoEntry = { ...source, pixels: new Uint8Array(source.pixels) };
  target.currentIndex = target.history.push(copy, target.currentIndex);
  // A copy is a duplicate: the destination takes the source's page size and
  // background color too, as CopyToSpare took `curxpc` in SPARE.C. Its previous
  // size is not worth preserving when its contents are being replaced wholesale.
  target.size = { ...context.state.canvas.resolution };
  target.backgroundColorId = context.state.palette.backgroundColorId;
  context.state.pages.pageCount = pageCount();
  syncBufferSize(context); // the other page's history just grew
};

// DPaint's Merge In Front / Merge In Back: the other page composited with this
// one, both landing on the page you are looking at. The other page is left
// alone — a merge reads *from* the spare, which is what makes it safe to keep
// material there and pull it in repeatedly.
//
// The two differ only in which page's background color is the stencil, and that
// asymmetry is the reason background color is per page at all (SPARE.C's
// MakeMrgMask, NEGATIVE against the spare's transparent color for front,
// POSITIVE against the current page's for back).
export const mergeFront = (context: Context): void => {
  merge(context, 'front');
};

export const mergeBack = (context: Context): void => {
  merge(context, 'back');
};

function merge(context: Context, order: 'front' | 'back'): void {
  const target = nextPage();
  const source = currentEntry(context);
  if (!target || !source) {
    // The gadgets are disabled with a single page; nothing else calls this.
    console.warn('pages.merge: no other page to merge');
    return;
  }
  const spareEntry = target.history.getItem(target.currentIndex);
  if (!spareEntry) {
    console.warn('pages.merge: the other page has no history entry');
    return;
  }
  const spare = toCanvasColorIndex(spareEntry);
  const current = toCanvasColorIndex(source);
  const currentBackground = Number(context.state.palette.backgroundColorId);

  const merged =
    order === 'front'
      ? // the spare over this page, its own background reading as transparent
        current.mergedWith(spare, Number(target.backgroundColorId))
      : // this page over the spare: the spare fills the size of this page first
        // (padded with this page's background, so anywhere the spare does not
        // reach still shows what is here), then this page paints over it with
        // its own background transparent
        spare
          .placedInto(current.width, current.height, currentBackground)
          .mergedWith(current, currentBackground);

  // Straight onto the canvas rather than through setPendingCanvasContent: the
  // page size does not change, and that path only uploads when a resolution
  // change re-renders the canvas element. One undo point for the whole merge.
  paintingCanvasController.setCanvasColorIndex(merged);
  paintingCanvasController.render();
  context.actions.undo.setUndoPoint();
}

// DP2's Delete This Page: drop the page on screen and show the other one. The
// manual confirms first, which the requester does before calling this.
//
// Not undoable: a page's history is the page, so once it is released there is
// nothing left to step back into.
export const deleteCurrentPage = (context: Context): void => {
  const target = removeCurrentPage();
  if (!target) {
    // A document always has a page. The gadget is disabled in this state.
    console.warn('pages.deleteCurrentPage: nothing to fall back to');
    return;
  }
  showCurrentPage(context, target);
};

// Puts a page on screen: its raster, its size, and the state that belongs to it
// rather than to the document. Shared by the swap and the delete, which differ
// only in what happens to the page being left.
function showCurrentPage(context: Context, target: Page): void {
  const entry = target.history.getItem(target.currentIndex);
  if (!entry) {
    console.warn('pages.showCurrentPage: the page has no history entry');
    return;
  }
  context.state.pages.currentPageIndex = currentPageIndex();
  context.state.pages.pageCount = pageCount();

  setPendingCanvasContent(toCanvasColorIndex(entry), { recordUndoPoint: false });
  // Through the action, so a matte brush picks up the new page's transparent
  // color; per page by decree of the DPaint II manual.
  context.actions.palette.setBackgroundColor(target.backgroundColorId);
  context.state.undo.currentIndex = target.currentIndex;
  // The readout describes a different history now, without either having been
  // written to.
  syncBufferSize(context);
  // Rides with the entry rather than being rescanned, exactly as undo/redo do:
  // an entry packs precisely when it holds no true-color pixels.
  context.state.canvas.hasTrueColorPixels = !entry.packed;
  // The zoom view was aimed at a point on the other page's picture. Closing it
  // is what setResolution does for a size change; a swap does it either way,
  // since the same coordinate on a different picture is not what was framed.
  context.state.toolbox.zoomModeOn = false;
  context.state.canvas.zoomFocusPoint = null;
  context.state.canvas.scrollFocusPoint = target.scrollFocusPoint;
  context.actions.canvas.setResolution({ ...target.size, recordUndoPoint: false });
}

// What the visible page holds. Its history's current entry is the canvas
// between strokes and costs nothing to read; the readback is the fallback for
// the one path that changes pixels without recording an entry
// (applyScreenFormat's conform, which leaves its caller to record one).
function currentEntry(context: Context): UndoEntry | null {
  const entry = currentHistory().getItem(context.state.undo.currentIndex);
  if (entry) {
    return entry;
  }
  const colorIndex = paintingCanvasController.getCanvasColorIndex();
  return colorIndex
    ? createUndoEntry(colorIndex, plainPalette(Object.values(context.state.palette.palette)))
    : null;
}

// A page nobody has painted on yet: the current canvas's size and background
// color, the way DPaint's spare started at the screen size and (its `newSpare`
// case) inherited the background you were already using.
//
// Seeded with one blank entry rather than an empty history, because a page's
// raster *is* its current entry: an empty history would be a page with no
// pixels to show.
function blankPage(context: Context): Page {
  const { width, height } = context.state.canvas.resolution;
  const backgroundColorId = context.state.palette.backgroundColorId;
  const history = new UndoBuffer();
  const blank = CanvasColorIndex.createEmptyWithBackgroundColor(
    width,
    height,
    Number(backgroundColorId)
  );
  const entry = createUndoEntry(blank, plainPalette(Object.values(context.state.palette.palette)));
  return {
    history,
    currentIndex: history.push(entry, null),
    size: { width, height },
    backgroundColorId,
    scrollFocusPoint: null,
  };
}
