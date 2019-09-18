import { useEffect } from 'react';
import { CanvasState } from './CanvasState';
import { useOvermind } from '../../overmind';
import { cloneCanvas } from './util';

interface Props {
  canvasState: CanvasState;
}

export function CanvasSyncHandler({ canvasState }: Props): null {
  console.log('render CanvasSyncHandler');

  const { state } = useOvermind();

  const { mainCanvas, zoomCanvas, mainOverlayCanvas, zoomOverlayCanvas } = canvasState;

  // sync drawing canvas

  useEffect((): void => {
    cloneCanvas(mainCanvas, zoomCanvas);
  }, [mainCanvas, zoomCanvas, state.canvas.mainCanvas.lastModified]);

  useEffect((): void => {
    cloneCanvas(zoomCanvas, mainCanvas);
  }, [mainCanvas, zoomCanvas, state.canvas.zoomCanvas.lastModified]);

  // sync overlay canvas

  useEffect((): void => {
    cloneCanvas(mainOverlayCanvas, zoomOverlayCanvas);
  }, [mainOverlayCanvas, zoomOverlayCanvas, state.canvas.mainCanvas.lastModifiedOverlay]);

  useEffect((): void => {
    cloneCanvas(zoomOverlayCanvas, mainOverlayCanvas);
  }, [mainOverlayCanvas, zoomOverlayCanvas, state.canvas.zoomCanvas.lastModifiedOverlay]);

  return null;
}
