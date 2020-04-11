import { Point } from '../../types';
import { useEffect } from 'react';
import { useOvermind } from '../../overmind';
import { blobToCanvas } from './util';
import { EventHandlerParams, EventHandlerParamsOverlay } from '../../tools/Tool';
import { clearCanvas } from '../../tools/util/util';

export function useInitTool(
  eventHandlerParams: EventHandlerParams,
  eventHandlerParamsOverlay: EventHandlerParamsOverlay,
  isZoomCanvas: boolean
): void {
  const { state } = useOvermind();
  useEffect((): void => {
    if (!isZoomCanvas) {
      state.toolbox.previousTool?.onExit?.(eventHandlerParams);
      state.toolbox.previousTool?.onExitOverlay?.(eventHandlerParamsOverlay);
    }
  }, [state.toolbox.previousTool]);
  useEffect((): void => {
    if (!isZoomCanvas) {
      state.toolbox.activeTool.onInit?.(eventHandlerParams);
      state.toolbox.activeTool.onInitOverlay?.(eventHandlerParamsOverlay);
    }
  }, [state.toolbox.activeTool]);
}

export function useFillStyle(ctx: CanvasRenderingContext2D | null): void {
  const { state } = useOvermind();
  useEffect((): void => {
    if (ctx) {
      ctx.fillStyle = state.canvas.fillStyle;
      ctx.strokeStyle = state.canvas.fillStyle;
    }
  }, [state.canvas.fillStyle]);
}

export function useUndo(canvas: HTMLCanvasElement): void {
  const { state } = useOvermind();
  useEffect((): void => {
    blobToCanvas(state.undo.currentBufferItem, canvas);
  }, [state.undo.lastUndoRedoTime]);
}

export function useLoadedImage(canvas: HTMLCanvasElement): void {
  // load image to canvas when loadedImageURL changes
  const { state, actions } = useOvermind();
  useEffect((): void => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const img = new Image();
    img.onload = function(): void {
      clearCanvas(canvas, state.palette.backgroundColor);
      ctx.drawImage(img, 0, 0);
      actions.undo.setUndoPoint(canvas);
      actions.canvas.setCanvasModified(false);
    };
    img.src = state.canvas.loadedImageURL;
  }, [state.canvas.loadedImageURL]);
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
