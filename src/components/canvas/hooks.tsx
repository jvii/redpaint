import { useEffect } from 'react';
import { useOvermind } from '../../overmind';
import { Point } from '../../types';
import { blobToCanvas } from './util';

export function useInitTool(canvas: HTMLCanvasElement, isZoomCanvas: boolean): void {
  const { state } = useOvermind();
  useEffect((): void => {
    if (typeof state.toolbar.activeTool.onInit !== 'undefined' && !isZoomCanvas) {
      state.toolbar.activeTool.onInit(canvas);
    }
  }, [state.toolbar.activeTool]);
}

export function useUndo(canvas: HTMLCanvasElement): void {
  const { state } = useOvermind();
  useEffect((): void => {
    blobToCanvas(state.undo.currentBufferItem, canvas);
  }, [state.undo.lastUndoRedoTime]);
}

export function useScrollToFocusPoint(
  canvasDiv: HTMLDivElement,
  focusPoint: Point | null,
  zoomFactor: number = 1
): void {
  useEffect((): void => {
    if (focusPoint === null) {
      return;
    }
    const scrollOptions = {
      left: focusPoint.x * zoomFactor - canvasDiv.clientWidth / 2,
      top: focusPoint.y * zoomFactor - canvasDiv.clientHeight / 2,
    };
    canvasDiv.scrollTo(scrollOptions);
  }, [focusPoint]);
}
