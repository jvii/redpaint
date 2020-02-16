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
    state.toolbox.zoomModeState = 'on';
  }
};

export const setCanvasModified: Action<boolean> = ({ state }, isZoomCanvas): void => {
  if (state.toolbox.zoomModeState !== 'on') {
    return;
  }
  if (isZoomCanvas) {
    state.canvas.zoomCanvas.lastModified = Date.now();
  } else {
    state.canvas.mainCanvas.lastModified = Date.now();
  }
};

export const setOverlayCanvasModified: Action<boolean> = ({ state }, isZoomCanvas): void => {
  if (state.toolbox.zoomModeState !== 'on') {
    return;
  }
  if (isZoomCanvas) {
    state.canvas.zoomCanvas.lastModifiedOverlay = Date.now();
  } else {
    state.canvas.mainCanvas.lastModifiedOverlay = Date.now();
  }
};

export const storeInvertedCanvas: Action<HTMLCanvasElement> = (
  { state },
  canvas: HTMLCanvasElement
): void => {
  let bufferCanvas = document.createElement('canvas');
  bufferCanvas.width = canvas.width;
  bufferCanvas.height = canvas.height;
  const bufferCanvasCtx = bufferCanvas.getContext('2d');
  if (!bufferCanvasCtx) {
    return;
  }
  bufferCanvasCtx.filter = 'invert(1)';
  bufferCanvasCtx.drawImage(canvas, 0, 0);
  bufferCanvasCtx.globalCompositeOperation = 'difference';
  bufferCanvasCtx.fillStyle = 'white';
  bufferCanvasCtx.globalAlpha = 1; // alpha 0 = no effect 1 = full effect
  bufferCanvasCtx.fillRect(0, 0, bufferCanvas.width, bufferCanvas.height);

  const pattern = bufferCanvasCtx.createPattern(bufferCanvas, 'no-repeat');
  if (pattern) {
    state.canvas.invertedCanvas = pattern;
  }
};
