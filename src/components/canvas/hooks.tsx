import React, { useEffect, useRef } from 'react';
import { Point } from '../../types';
import { overmind } from '../..';
import { useActions, useAppState } from '../../overmind';
import { undoBuffer } from '../../overmind/undo/UndoBuffer';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { CanvasColorIndex } from '../../domain/CanvasColorIndex';
import {
  setPendingCanvasContent,
  takePendingCanvasContent,
} from '../../canvas/pendingCanvasContent';

// Recover from WebGL context loss (Safari in particular kills contexts
// under GPU memory pressure). Without preventDefault on webglcontextlost
// the browser never fires webglcontextrestored; on restore, all GL objects
// are invalid, so both controllers rebuild their programs/buffers/textures,
// and the committed pixels are repainted from the undo buffer's current
// snapshot (the GPU-side color index is gone).
export function useContextLossRecovery(
  paintingCanvasRef: React.RefObject<HTMLCanvasElement>,
  overlayCanvasRef: React.RefObject<HTMLCanvasElement>,
  isZoomCanvas: boolean
): void {
  useEffect((): (() => void) | void => {
    if (isZoomCanvas) {
      return; // the zoom canvases are 2D mirrors, no WebGL context to lose
    }
    // read the refs inside the effect: at render time they still hold the
    // placeholder canvas, the real elements are only assigned on commit
    const paintingCanvas = paintingCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const allowRestore = (event: Event): void => {
      console.warn('WebGL context lost', event.target);
      event.preventDefault();
    };
    const restorePaintingCanvas = (): void => {
      console.warn('WebGL context restored (painting canvas)');
      paintingCanvasController.restoreContext();
      const colorIndex = undoBuffer.getItem(overmind.state.undo.currentIndex);
      if (colorIndex) {
        paintingCanvasController.setCanvasColorIndex(colorIndex);
      }
      paintingCanvasController.render();
    };
    const restoreOverlayCanvas = (): void => {
      console.warn('WebGL context restored (overlay canvas)');
      // the overlay holds only ephemeral previews: rebuilding the GL state
      // is enough, the next mouse move repaints it
      overlayCanvasController.attachMainCanvas(overlayCanvas);
    };
    paintingCanvas.addEventListener('webglcontextlost', allowRestore);
    overlayCanvas.addEventListener('webglcontextlost', allowRestore);
    paintingCanvas.addEventListener('webglcontextrestored', restorePaintingCanvas);
    overlayCanvas.addEventListener('webglcontextrestored', restoreOverlayCanvas);
    return (): void => {
      paintingCanvas.removeEventListener('webglcontextlost', allowRestore);
      overlayCanvas.removeEventListener('webglcontextlost', allowRestore);
      paintingCanvas.removeEventListener('webglcontextrestored', restorePaintingCanvas);
      overlayCanvas.removeEventListener('webglcontextrestored', restoreOverlayCanvas);
    };
  }, []);
}

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

// Load image to canvas when loadedImageURL changes. The image is decoded via an
// offscreen 2d canvas at its own size and written into the color index as
// true-color pixels (see docs/true-color-mode.md). The canvas is resized to the
// image, which re-inits the GL drawing buffer, so the decoded pixels are queued
// and uploaded by the second effect once React has committed the resize.
export function useLoadedImage(): void {
  const state = useAppState();
  const actions = useActions();

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
      const colorIndex = CanvasColorIndex.fromImageData(
        ctx.getImageData(0, 0, image.width, image.height)
      );
      setPendingCanvasContent(colorIndex);
      actions.canvas.setResolution({ width: image.width, height: image.height });
    };
    image.onerror = (): void => {
      actions.app.setLoading(false);
    };
    image.src = state.canvas.loadedImageURL;
  }, [state.canvas.loadedImageURL]);

  // Uploads content queued for after a resolution change — an image load or a
  // content-preserving canvas resize — once React has committed the canvas
  // element resize (which re-inits the GL drawing buffer).
  useEffect((): void => {
    const pending = takePendingCanvasContent();
    if (!pending) {
      return;
    }
    paintingCanvasController.setCanvasColorIndex(pending);
    paintingCanvasController.render();
    actions.undo.setUndoPoint();
    actions.app.setLoading(false);
  }, [state.canvas.resolution]);
}

// scale converts page pixels to CSS pixels — per axis, because a screen
// format's pixel aspect can stretch the two axes differently.
export function useScrollToFocusPoint(
  canvasDiv: HTMLDivElement,
  focusPoint: Point | null,
  scale: Point = { x: 1, y: 1 }
): void {
  useEffect((): void => {
    if (focusPoint === null) {
      return;
    }
    const scrollOptions = {
      left: focusPoint.x * scale.x - canvasDiv.clientWidth / 2,
      top: focusPoint.y * scale.y - canvasDiv.clientHeight / 2,
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
