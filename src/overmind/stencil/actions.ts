import { Context } from '../../overmind';
import { stencil } from '../../canvas/Stencil';
import { background } from '../../canvas/Background';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';

// Every action here ends the same way: push the raster to its texture and
// mirror what the UI needs back into state.
function sync(context: Context): void {
  paintingCanvasController.updateStencil();
  overlayCanvasController.updateStencil();
  context.state.stencil.exists = stencil.exists;
  context.state.stencil.enabled = stencil.enabled;
}

export const openRequester = (context: Context): void => {
  context.state.stencil.lockedColorsSnapshot = [...context.state.stencil.lockedColors];
  context.state.stencil.requesterOpen = true;
  context.actions.toolbox.enterCanvasPickMode('stencilColorSelectorTool');
};

export const closeRequester = (context: Context): void => {
  context.state.stencil.requesterOpen = false;
  context.state.stencil.lockedColorsSnapshot = null;
  context.actions.toolbox.exitCanvasPickMode();
};

export const cancelRequester = (context: Context): void => {
  const snapshot = context.state.stencil.lockedColorsSnapshot;
  if (snapshot) {
    // A copy: the snapshot is state of its own, and assigning it back puts one
    // proxied array inside another.
    context.state.stencil.lockedColors = [...snapshot];
  }
  context.actions.stencil.closeRequester();
};

export const toggleColor = (context: Context, colorNumber: number): void => {
  const locked = [...context.state.stencil.lockedColors];
  locked[colorNumber] = !locked[colorNumber];
  context.state.stencil.lockedColors = locked;
};

export const clearColors = (context: Context): void => {
  context.state.stencil.lockedColors = [];
};

// DPaint's Invert: the tick marks flip, which is how "lock everything except
// this one" is four clicks rather than thirty-one.
export const invertColors = (context: Context, colorCount: number): void => {
  context.state.stencil.lockedColors = inverted(context.state.stencil.lockedColors, colorCount);
};

// Over the whole palette, not over the array: the ticks are sparse, so mapping
// it would visit only the colors already touched and leave every one above the
// highest of them unlocked.
function inverted(locked: readonly boolean[], colorCount: number): boolean[] {
  const out: boolean[] = [];
  for (let n = 1; n <= colorCount; n++) {
    out[n] = !locked[n];
  }
  return out;
}

export const make = (context: Context): void => {
  const canvas = paintingCanvasController.getCanvasColorIndex();
  if (!canvas) {
    return;
  }
  stencil.make(canvas, context.state.stencil.lockedColors);
  sync(context);
  context.actions.stencil.closeRequester();
};

// Retakes the mask from the picture as it is now, with the same colors: what
// makes pixels painted since Make protected too.
export const remake = (context: Context): void => {
  const canvas = paintingCanvasController.getCanvasColorIndex();
  if (!canvas) {
    return;
  }
  stencil.remake(canvas);
  sync(context);
};

export const reverse = (context: Context, colorCount: number): void => {
  const canvas = paintingCanvasController.getCanvasColorIndex();
  if (!canvas) {
    return;
  }
  const locked = inverted(context.state.stencil.lockedColors, colorCount);
  stencil.reverse(canvas, locked);
  context.state.stencil.lockedColors = locked;
  sync(context);
};

// DPaint's Lock FG: lock everything painted since the background was fixed,
// whatever color it is. Needs a fixed background to measure against.
export const lockPainted = (context: Context): void => {
  const canvas = paintingCanvasController.getCanvasColorIndex();
  const frozen = background.frozen;
  if (!canvas || !frozen) {
    return;
  }
  stencil.lockPainted(canvas, frozen);
  context.state.stencil.lockedColors = [];
  sync(context);
};

export const toggleEnabled = (context: Context): void => {
  stencil.setEnabled(!stencil.enabled, paintingCanvasController.getCanvasColorIndex() ?? null);
  sync(context);
};

export const free = (context: Context): void => {
  stencil.free();
  context.state.stencil.lockedColors = [];
  sync(context);
};

// A page swap: the stencil is a mask over a picture and the picture just
// changed, so it applies only where the arriving page left it applying. No
// canvas passed, so the raster keeps the pixels it froze: the page arriving is
// the one it was suspended on, and its picture cannot have been painted since.
export const setEnabledForPage = (context: Context, on: boolean): void => {
  if (stencil.enabled === on) {
    return;
  }
  stencil.setEnabled(on, null);
  sync(context);
};

// A stencil and a fixed background are both cut from the pixels of the picture
// that was open, so neither means anything against the one replacing it.
export const dropForNewPicture = (context: Context): void => {
  context.actions.stencil.free();
  context.actions.background.free();
};
