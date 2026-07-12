import React, { useEffect, useRef } from 'react';
import { Point } from '../../types';
import { overmind } from '../..';
import { useActions, useAppState } from '../../overmind';
import { undoBuffer } from '../../overmind/undo/UndoBuffer';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { takePendingCanvasContent } from '../../canvas/pendingCanvasContent';

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

// Uploads content queued for after a resolution change — a loaded image or a
// content-preserving canvas resize — once React has committed the canvas
// element resize (which re-inits the GL drawing buffer). Image decode itself
// happens up front, before the load requester (app.beginImageLoad).
export function useCanvasContentUpload(): void {
  const state = useAppState();
  const actions = useActions();

  useEffect((): void => {
    const pending = takePendingCanvasContent();
    if (!pending) {
      return;
    }
    paintingCanvasController.setCanvasColorIndex(pending.content);
    paintingCanvasController.render();
    if (pending.freshDocument) {
      // a loaded image starts a new document: drop the old picture's history
      // (setUndoPoint below makes the fresh content its single entry)
      actions.undo.reset();
    }
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
