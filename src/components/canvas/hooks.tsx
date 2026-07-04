import { Point } from '../../types';
import { useEffect, useRef } from 'react';
import { useActions, useAppState } from '../../overmind';
import { undoBuffer } from '../../overmind/undo/UndoBuffer';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { CanvasColorIndex } from '../../domain/CanvasColorIndex';

export function useInitTool(isZoomCanvas: boolean): void {
  const state = useAppState();
  useEffect((): void => {
    if (!isZoomCanvas) {
      state.toolbox.previousTool?.onExit?.();
      state.toolbox.previousTool?.onExitOverlay?.();
      console.log('init tool pre');
    }
  }, [state.toolbox.previousTool]);
  useEffect((): void => {
    if (!isZoomCanvas) {
      state.toolbox.activeTool.onInit?.();
      state.toolbox.activeTool.onInitOverlay?.();
      console.log('init tool active');
    }
  }, [state.toolbox.activeTool]);
}

export function useUndo(): void {
  const state = useAppState();
  useEffect((): void => {
    if (state.undo.currentIndex === null) {
      return;
    }
    const colorIndex = undoBuffer.getItem(state.undo.currentIndex);
    if (state.undo.currentIndex === -1) {
      throw new Error('No color index in undo buffer at index' + state.undo.currentIndex);
    }
    paintingCanvasController.setCanvasColorIndex(colorIndex);
    paintingCanvasController.render();
  }, [state.undo.lastUndoRedoTime]);
}

// Load image to canvas when loadedImageURL changes.
// The image is decoded via an offscreen 2d canvas and written into the color
// index as true-color pixels (see docs/true-color-mode.md). Resizing the
// canvas element resets the GL drawing buffer, so the decoded pixels are
// uploaded in a second effect that runs after React has committed the resize.
export function useLoadedImage(): void {
  const state = useAppState();
  const actions = useActions();
  const pendingColorIndex = useRef<CanvasColorIndex | null>(null);

  useEffect((): void => {
    if (!state.canvas.loadedImageURL) {
      return;
    }
    actions.app.setLoading(true);
    const image = new Image();
    image.onload = (): void => {
      const decodeCanvas = document.createElement('canvas');
      decodeCanvas.width = image.width;
      decodeCanvas.height = image.height;
      const ctx = decodeCanvas.getContext('2d');
      if (!ctx) {
        actions.app.setLoading(false);
        return;
      }
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, image.width, image.height);
      pendingColorIndex.current = CanvasColorIndex.fromImageData(imageData);
      // resizes the canvas element and re-inits the painting canvas controller;
      // the effect below uploads the pixels once the resize has been committed
      actions.canvas.setResolution({ width: image.width, height: image.height });
    };
    image.onerror = (): void => {
      actions.app.setLoading(false);
    };
    image.src = state.canvas.loadedImageURL;
  }, [state.canvas.loadedImageURL]);

  useEffect((): void => {
    if (!pendingColorIndex.current) {
      return;
    }
    paintingCanvasController.setCanvasColorIndex(pendingColorIndex.current);
    paintingCanvasController.render();
    pendingColorIndex.current = null;
    actions.undo.setUndoPoint();
    actions.app.setLoading(false);
  }, [state.canvas.resolution]);
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

export function useRefreshZoomCanvas(zoomModeOn: boolean): void {
  useEffect((): void => {
    if (!zoomModeOn) {
      return;
    }
    paintingCanvasController.render();
  }, [zoomModeOn]);
}
