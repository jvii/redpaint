import { Context } from '../../overmind'
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { setPendingCanvasContent } from '../../canvas/pendingCanvasContent';
import { Point } from '../../types';
import { PendingScreenFormat, ScaleMode, ScreenFormatId, screenFormats } from './state';

type Resolution = { width: number; height: number };

export interface SetResolutionParams extends Resolution {
  // Whether the freshly initialized (empty) canvas becomes a history entry.
  // True for a bare resize (startup sizing the canvas to the window); false
  // when content is queued to follow (image load, content-preserving resize,
  // undo restore) — there the upload effect owns the history, and recording
  // here would plant a blank artifact entry the user then undoes onto.
  recordUndoPoint?: boolean;
}

export const setResolution = (
  context: Context,
  { width, height, recordUndoPoint = true }: SetResolutionParams
): void => {
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

// Applies only which screen is simulated. How that screen is scaled into the
// window is an independent view preference (see setScaleMode), and resizing the
// canvas to the screen is a separate, conditional step (see the Screen Format
// requester): grow/crop/scale only when it matters.
export const setScreenFormat = (
  context: Context,
  { formatId }: SetScreenFormatParams
): void => {
  context.state.canvas.screenFormatId = formatId;
};

// How the simulated screen fills the window. Independent of the format, and
// meaningless for Native pixels (which is always 1:1), so it lives outside the
// Screen Format requester.
export const setScaleMode = (context: Context, scaleMode: ScaleMode): void => {
  context.state.canvas.scaleMode = scaleMode;
};

export const toggleScaleMode = (context: Context): void => {
  context.state.canvas.scaleMode =
    context.state.canvas.scaleMode === 'integer' ? 'stretch' : 'integer';
};

export interface ApplyScreenFormatParams extends SetScreenFormatParams {
  colors: number;
}

// Commits a screen format choice: the palette depth and the simulated screen,
// then pushes the resized palette into the GL textures (which don't watch
// Overmind). The canvas resize, if any, is the caller's separate step. Both the
// Screen Format requester and the shrink question commit through here, so a
// deferred change applies exactly like an immediate one.
export const applyScreenFormat = (
  context: Context,
  { formatId, colors }: ApplyScreenFormatParams
): void => {
  context.actions.palette.setNumberOfColors(colors);
  context.actions.canvas.setScreenFormat({ formatId });
  paintingCanvasController.updatePalette();
  overlayCanvasController.updatePalette();
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
