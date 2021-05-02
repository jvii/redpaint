import { Action } from 'overmind';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { Point } from '../../types';

type Resolution = { width: number; height: number };

export const setResolution: Action<Resolution> = ({ state }, resolution): void => {
  state.canvas.resolution = resolution;
  paintingCanvasController.init();
};

export const setScrollFocusPoint: Action<Point> = ({ state }, point): void => {
  state.canvas.scrollFocusPoint = point;
};

export const setZoomFocusPoint: Action<Point | null> = ({ state }, point): void => {
  state.canvas.zoomFocusPoint = point;
  if (point != null) {
    state.toolbox.zoomModeOn = true;
    state.toolbox.selectedSelectorToolId = null;
  }
};

export const setLoadedImage: Action<string> = ({ state }, loadedImageURL): void => {
  state.canvas.loadedImageURL = loadedImageURL;
};
