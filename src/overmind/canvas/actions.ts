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
  // Resize the canvas (the pixel bitmap) to one screenful, or leave it as it
  // is under the new screen. TODO: the resize currently clears the canvas — a
  // real resize/remap of the existing pixels is still to come.
  resizeCanvasToScreen: boolean;
}

export const setScreenFormat = (
  context: Context,
  { formatId, scaleMode, resizeCanvasToScreen }: SetScreenFormatParams
): void => {
  context.state.canvas.screenFormatId = formatId;
  context.state.canvas.scaleMode = scaleMode;
  if (formatId !== null && resizeCanvasToScreen) {
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
