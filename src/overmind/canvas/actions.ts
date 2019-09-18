import { Action } from 'overmind';
import { Point } from '../../types';

type Resolution = { width: number; height: number };

export const setResolution: Action<Resolution> = ({ state }, resolution) => {
  state.canvas.resolution = resolution;
};

export const setScrollFocusPoint: Action<Point> = ({ state }, point) => {
  state.canvas.scrollFocusPoint = point;
};

export const setZoomFocusPoint: Action<Point | null> = ({ state }, point) => {
  state.canvas.zoomFocusPoint = point;
};

export const setCanvasModified: Action<boolean> = ({ state }, isZoomCanvas) => {
  if (isZoomCanvas) {
    state.canvas.zoomCanvas.lastModified = Date.now();
  } else {
    state.canvas.mainCanvas.lastModified = Date.now();
  }
};

export const setOverlayCanvasModified: Action<boolean> = ({ state }, isZoomCanvas) => {
  if (isZoomCanvas) {
    state.canvas.zoomCanvas.lastModifiedOverlay = Date.now();
  } else {
    state.canvas.mainCanvas.lastModifiedOverlay = Date.now();
  }
};
