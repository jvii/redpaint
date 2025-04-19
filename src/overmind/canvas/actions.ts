import { Context } from '../../overmind'
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { Point } from '../../types';

type Resolution = { width: number; height: number };

export const setResolution = (context: Context, resolution: Resolution): void => {
  context.state.canvas.resolution = resolution;
  paintingCanvasController.init();
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
