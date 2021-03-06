import { useEffect } from 'react';
import { CanvasState } from './CanvasState';
import { useOvermind } from '../../overmind';
import { cloneCanvas } from './util';

interface Props {
  canvasState: CanvasState;
}

export function CanvasSyncHandler({ canvasState }: Props): null {
  console.log('render CanvasSyncHandler');

  // Sync canvas and zoom canvas
  // only required to sync if:
  //  - either canvas was modified OR zoomMode was toggled
  //  - zoomMode is on

  const { state } = useOvermind();
  const { mainCanvas, zoomCanvas, mainOverlayCanvas, zoomOverlayCanvas } = canvasState;

  // sync drawing canvas with zoom canvas

  useEffect((): void => {
    if (state.toolbox.zoomModeOn) {
      cloneCanvas(mainCanvas, zoomCanvas);
    }
  }, [mainCanvas, zoomCanvas, state.toolbox.zoomModeOn, state.canvas.mainCanvas.lastModified]);

  useEffect((): void => {
    if (state.toolbox.zoomModeOn) {
      cloneCanvas(zoomCanvas, mainCanvas);
    }
  }, [mainCanvas, zoomCanvas, state.toolbox.zoomModeOn, state.canvas.zoomCanvas.lastModified]);

  // sync overlay canvas with zoom overlay canvas

  useEffect((): void => {
    if (state.toolbox.zoomModeOn) {
      cloneCanvas(mainOverlayCanvas, zoomOverlayCanvas);
    }
  }, [
    mainOverlayCanvas,
    zoomOverlayCanvas,
    state.toolbox.zoomModeOn,
    state.canvas.mainCanvas.lastModifiedOverlay,
  ]);

  useEffect((): void => {
    if (state.toolbox.zoomModeOn) {
      cloneCanvas(zoomOverlayCanvas, mainOverlayCanvas);
    }
  }, [
    mainOverlayCanvas,
    zoomOverlayCanvas,
    state.toolbox.zoomModeOn,
    state.canvas.zoomCanvas.lastModifiedOverlay,
  ]);

  return null;
}
