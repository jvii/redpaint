import { Context } from '../../overmind';
import { CropRect } from './state';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';

// Opens a crop box over the whole canvas, for the user to pull in. Starting
// from the full canvas rather than from nothing means there's always something
// to grab: a box you must first draw is a mode that looks broken until you
// guess the gesture.
export const begin = (context: Context): void => {
  const { width, height } = context.state.canvas.resolution;
  if (width <= 0 || height <= 0) {
    return;
  }
  context.state.crop.rect = { x: 0, y: 0, width, height };
};

export const setRect = (context: Context, rect: CropRect): void => {
  context.state.crop.rect = rect;
};

export const cancel = (context: Context): void => {
  context.state.crop.rect = null;
};

// Keeps the boxed region, discarding the rest. Goes through the same
// pending-content path as every other resize, so the crop lands as one undo
// entry and Ctrl+Z restores both the pixels and the pre-crop canvas size.
export const apply = (context: Context): void => {
  const rect = context.state.crop.rect;
  context.state.crop.rect = null;
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return;
  }
  const current = paintingCanvasController.getCanvasColorIndex();
  const { width, height } = context.state.canvas.resolution;
  if (!current || (rect.width === width && rect.height === height)) {
    return; // nothing trimmed
  }
  context.actions.canvas.cropCanvas(rect);
};
