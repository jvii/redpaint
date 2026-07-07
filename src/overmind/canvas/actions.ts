import { Context } from '../../overmind'
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { setPendingCanvasContent } from '../../canvas/pendingCanvasContent';
import { Point } from '../../types';
import { ScaleMode, ScreenFormatId, screenFormats } from './state';

type Resolution = { width: number; height: number };

export const setResolution = (context: Context, resolution: Resolution): void => {
  context.state.canvas.resolution = resolution;
  paintingCanvasController.init();
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
  context.actions.canvas.setResolution({ width, height });
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
  context.actions.canvas.setResolution({ width, height });
};

// Holds the target size for a pending shrink question (see pendingScreenResize).
export const setPendingScreenResize = (
  context: Context,
  target: { width: number; height: number } | null
): void => {
  context.state.canvas.pendingScreenResize = target;
};

export interface SetScreenFormatParams {
  formatId: ScreenFormatId | null;
  scaleMode: ScaleMode;
}

// Applies only the simulated screen (which format is active and how it scales
// to the window). Resizing the canvas to the screen is a separate, conditional
// step (see the Screen Format dialog): grow/crop/scale only when it matters.
export const setScreenFormat = (
  context: Context,
  { formatId, scaleMode }: SetScreenFormatParams
): void => {
  context.state.canvas.screenFormatId = formatId;
  context.state.canvas.scaleMode = scaleMode;
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

export const setLoadedImage = (context: Context, loadedImageURL: string): void => {
  context.state.canvas.loadedImageURL = loadedImageURL;
};
