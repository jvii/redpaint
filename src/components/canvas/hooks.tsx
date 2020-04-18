import { Point } from '../../types';
import { useEffect } from 'react';
import { useOvermind } from '../../overmind';
import { blobToCanvas } from './util';
import { EventHandlerParams, EventHandlerParamsOverlay } from '../../tools/Tool';

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

// Update current fillStyle from state to canvas context when:
// 1. fillStyle has been changed
// 2. canvas resolution changes, as this also resets context
export function useFillStyle(ctx: CanvasRenderingContext2D | null): void {
  const { state } = useOvermind();
  useEffect((): void => {
    if (ctx) {
      ctx.fillStyle = state.canvas.fillStyle;
      ctx.strokeStyle = state.canvas.fillStyle;
    }
  }, [state.canvas.fillStyle, state.canvas.resolution]);
}

export function useUndo(canvas: HTMLCanvasElement): void {
  const { state } = useOvermind();
  useEffect((): void => {
    blobToCanvas(state.undo.currentBufferItem, canvas);
  }, [state.undo.lastUndoRedoTime]);
}

// Load image to canvas when loadedImageURL changes
// Changes canvas height and width to match image
export function useLoadedImage(canvas: HTMLCanvasElement): void {
  const { state, actions } = useOvermind();
  useEffect((): void => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const image = new Image();
    image.onload = function(): void {
      // No need to clear canvas, as changing dimensions clears it anyway.
      // Note that context is also reset
      actions.canvas.setResolution({ width: image.width, height: image.height });
      ctx.drawImage(image, 0, 0);
      actions.undo.setUndoPoint(canvas);
      actions.canvas.setCanvasModified(false);
    };
    image.src = state.canvas.loadedImageURL;
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
