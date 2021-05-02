import { Point } from '../../types';
import { useEffect } from 'react';
import { useOvermind } from '../../overmind';
import { undoBuffer } from '../../overmind/undo/UndoBuffer';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';

export function useInitTool(isZoomCanvas: boolean): void {
  const { state } = useOvermind();
  useEffect((): void => {
    if (!isZoomCanvas) {
      state.toolbox.previousTool?.onExit?.();
      state.toolbox.previousTool?.onExitOverlay?.();
    }
  }, [state.toolbox.previousTool]);
  useEffect((): void => {
    if (!isZoomCanvas) {
      state.toolbox.activeTool.onInit?.();
      state.toolbox.activeTool.onInitOverlay?.();
    }
  }, [state.toolbox.activeTool]);
}

export function useUndo(): void {
  const { state } = useOvermind();
  useEffect((): void => {
    if (state.undo.currentIndex === null) {
      return;
    }
    const colorIndex = undoBuffer.getItem(state.undo.currentIndex);
    if (!colorIndex) {
      throw 'No color index in undo buffer at index' + state.undo.currentIndex;
    }
    paintingCanvasController.setIndex(colorIndex);
    paintingCanvasController.render();
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
    image.onload = function (): void {
      // No need to clear canvas, as changing dimensions clears it anyway.
      // Note that context is also reset
      actions.canvas.setResolution({ width: image.width, height: image.height });
      ctx.drawImage(image, 0, 0);
      actions.undo.setUndoPoint();
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
