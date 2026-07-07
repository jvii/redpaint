import { Context } from '../../overmind'
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { Point } from '../../types';
import { ScaleMode, ScreenFormatId, screenFormats } from './state';

type Resolution = { width: number; height: number };

export const setResolution = (context: Context, resolution: Resolution): void => {
  context.state.canvas.resolution = resolution;
  paintingCanvasController.init();
};

export interface SetScreenFormatParams {
  formatId: ScreenFormatId | null;
  scaleMode: ScaleMode;
  // DPaint's "Screen Size Page" vs "Keep Same Page": resize the page (the
  // bitmap — this clears the drawing, no resize/remap of existing pixels
  // yet) to one screenful, or leave it as it is.
  resizePageToScreen: boolean;
}

export const setScreenFormat = (
  context: Context,
  { formatId, scaleMode, resizePageToScreen }: SetScreenFormatParams
): void => {
  context.state.canvas.screenFormatId = formatId;
  context.state.canvas.scaleMode = scaleMode;
  if (formatId !== null && resizePageToScreen) {
    const format = screenFormats[formatId];
    context.actions.canvas.setResolution({ width: format.width, height: format.height });
  }
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
