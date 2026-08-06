import React, { useEffect, useRef, useState } from 'react';
import { Point } from '../../types';
import { forgetFileHandles } from '../menu/savedFileHandle';
import { overmind } from '../..';
import { useActions, useAppState } from '../../overmind';
import { toCanvasColorIndex, undoBuffer } from '../../overmind/undo/UndoBuffer';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
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
      const entry = undoBuffer.getItem(overmind.state.undo.currentIndex);
      if (entry) {
        paintingCanvasController.setCanvasColorIndex(toCanvasColorIndex(entry));
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
    }
  }, [state.toolbox.previousTool]);
  useEffect((): void => {
    if (!isZoomCanvas) {
      state.toolbox.activeTool.onInit?.();
      state.toolbox.activeTool.onInitOverlay?.();
    }
  }, [state.toolbox.activeTool]);
}

// Repaints the canvas when undo or redo steps to a different entry.
//
// The main canvas only, like useInitTool: `Canvas` is mounted twice, and this
// restoring history once per instance was a real bug. The first instance queued
// the snapshot and asked for its resolution; the second then re-ran, found the
// resolution *already* matching the entry, and took the direct branch below —
// painting into a drawing buffer that had not been resized yet, which the
// resize then cleared. The queued content was left stranded, so undoing a
// canvas size change showed nothing at all until some later render happened to
// flush it. The zoom view needs none of this: it mirrors the painting canvas's
// texture rather than holding its own.
export function useUndo(isZoomCanvas: boolean): void {
  const state = useAppState();
  const actions = useActions();
  useEffect((): void => {
    if (isZoomCanvas || state.undo.currentIndex === null) {
      return;
    }
    const entry = undoBuffer.getItem(state.undo.currentIndex);
    if (!entry) {
      throw new Error('No entry in undo buffer at index ' + state.undo.currentIndex);
    }
    const colorIndex = toCanvasColorIndex(entry);
    // History can cross canvas sizes (a snapshot from before a resize). A
    // repaint into a different-size GL buffer would show the snapshot cropped
    // or stretched, so restore the snapshot's own resolution first and let the
    // resolution effect upload it after the resize commits — without touching
    // the history being navigated.
    const resolution = state.canvas.resolution;
    if (colorIndex.width !== resolution.width || colorIndex.height !== resolution.height) {
      setPendingCanvasContent(colorIndex, { recordUndoPoint: false });
      // Out of the commit phase before mutating: a resolution change made
      // synchronously inside an effect did not re-render the canvas at all, so
      // the element kept its old size, the queued snapshot was never uploaded,
      // and the picture only appeared once something unrelated — a click —
      // forced a render. Off a microtask it behaves exactly like the same
      // change made from an event handler.
      queueMicrotask((): void => {
        actions.canvas.setResolution({
          width: colorIndex.width,
          height: colorIndex.height,
          recordUndoPoint: false,
        });
      });
      return;
    }
    paintingCanvasController.setCanvasColorIndex(colorIndex);
    paintingCanvasController.render();
  }, [state.undo.lastUndoRedoTime]);
}

// Uploads content queued for after a resolution change — a loaded image, a
// content-preserving canvas resize, or an undo/redo restore across a canvas
// size change — once React has committed the canvas element resize (which
// re-inits the GL drawing buffer). Image decode itself happens up front,
// before the load requester (app.beginImageLoad).
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
    if (pending.recordUndoPoint) {
      actions.undo.setUndoPoint();
    }
    if (pending.freshDocument) {
      // A picture just loaded from a file already matches one, so it starts
      // clean — the same reading an editor gives a file it has just opened. It
      // takes that file's name, or none at all when the pixels came from
      // somewhere unnamed; either way the previous document's name is gone.
      actions.app.setDocumentName(pending.documentName);
      forgetFileHandles();
      if (pending.documentModified) {
        actions.app.markDocumentModified();
      } else {
        actions.app.markDocumentClean();
      }
    }
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
    // Re-runs on a scale change as well as a focus point change: what a given
    // scroll offset centers on depends on both. With a screen format active
    // the two move together — opening the zoom view shrinks the main pane,
    // which re-fits the main canvas, which changes the zoom view's own scale
    // (a multiple of it) — so a scroll computed at the old scale would be
    // left pointing somewhere else entirely.
  }, [focusPoint, scale.x, scale.y]);
}

export function useRefreshZoomCanvas(zoomModeOn: boolean): void {
  useEffect((): void => {
    if (!zoomModeOn) {
      return;
    }
    paintingCanvasController.render();
  }, [zoomModeOn]);
}

// window.devicePixelRatio folds together OS display scaling (Windows' 125%/
// 150% presets) and browser zoom into one CSS-pixels-per-physical-pixel
// ratio. The painting canvas divides its CSS size by this so that "no zoom"
// always means one artwork pixel per physical screen pixel, the same way a
// native image viewer's 100% view is unaffected by OS scaling — instead of
// ballooning by whatever the host happens to be scaled to. A matchMedia query
// at the current ratio fires exactly once, the next time the ratio changes
// (screen change, OS scaling change, browser zoom); each firing re-subscribes
// at the new ratio, since the old query is now stale.
export function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(window.devicePixelRatio);

  useEffect((): (() => void) => {
    const media = window.matchMedia(`(resolution: ${dpr}dppx)`);
    const update = (): void => setDpr(window.devicePixelRatio);
    media.addEventListener('change', update);
    return (): void => media.removeEventListener('change', update);
  }, [dpr]);

  return dpr;
}
