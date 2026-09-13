import { Context } from '../../overmind';
import { stencil } from '../../canvas/Stencil';
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
};

export const closeRequester = (context: Context): void => {
  context.state.stencil.requesterOpen = false;
  context.state.stencil.lockedColorsSnapshot = null;
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
  const locked = [...context.state.stencil.lockedColors];
  for (let n = 1; n <= colorCount; n++) {
    locked[n] = !locked[n];
  }
  context.state.stencil.lockedColors = locked;
};

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

export const reverse = (context: Context): void => {
  const canvas = paintingCanvasController.getCanvasColorIndex();
  if (!canvas) {
    return;
  }
  stencil.reverse(canvas);
  context.state.stencil.lockedColors = [...stencil.colors];
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
