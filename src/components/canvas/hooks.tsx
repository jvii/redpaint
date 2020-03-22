import { Point } from '../../types';
import { useEffect } from 'react';
import { useOvermind } from '../../overmind';
import { blobToCanvas } from './util';

export function useInitTool(canvas: HTMLCanvasElement, isZoomCanvas: boolean): void {
  const { state } = useOvermind();
  useEffect((): void => {
    if (typeof state.toolbox.activeTool.onInit !== 'undefined' && !isZoomCanvas) {
      state.toolbox.activeTool.onInit(canvas);
    }
  }, [state.toolbox.activeTool]);
}

export function useFillStyle(ctx: CanvasRenderingContext2D | null): void {
  const { state } = useOvermind();
  useEffect((): void => {
    if (ctx) {
      ctx.fillStyle = state.canvas.fillStyle;
    }
  }, [state.canvas.fillStyle]);
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
  zoomFactor = 1
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
