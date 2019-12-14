import { Action } from 'overmind';
import { Point } from '../../types';

type Resolution = { width: number; height: number };

export const setResolution: Action<Resolution> = ({ state }, resolution): void => {
  state.canvas.resolution = resolution;
};

export const setScrollFocusPoint: Action<Point> = ({ state }, point): void => {
  state.canvas.scrollFocusPoint = point;
};

export const setZoomFocusPoint: Action<Point | null> = ({ state }, point): void => {
  state.canvas.zoomFocusPoint = point;
  if (point != null) {
    state.toolbar.zoomModeState = 'on';
  }
};

export const setCanvasModified: Action<boolean> = ({ state }, isZoomCanvas): void => {
  if (isZoomCanvas) {
    state.canvas.zoomCanvas.lastModified = Date.now();
  } else {
    state.canvas.mainCanvas.lastModified = Date.now();
  }
};

export const setOverlayCanvasModified: Action<boolean> = ({ state }, isZoomCanvas): void => {
  if (isZoomCanvas) {
    state.canvas.zoomCanvas.lastModifiedOverlay = Date.now();
  } else {
    state.canvas.mainCanvas.lastModifiedOverlay = Date.now();
  }
};
