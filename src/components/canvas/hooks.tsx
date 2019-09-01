import { CanvasStateAction } from './CanvasState';
import { useEffect, useState, useMemo } from 'react';
import ToolbarState from '../toolbar/ToolbarState';
import { ToolState, Action } from '../../tools/ToolState';
import { UndoState, UndoStateAction } from './UndoState';
import { ZoomInitialPointSelectorTool } from '../../tools/ZoomInitialPointSelectorTool';
import { Point } from '../../types';
import { clearCanvas } from '../../tools/util';

export function useCanvasSync(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  syncTargetCanvas: HTMLCanvasElement | null,
  toolbarState: ToolbarState
): [React.Dispatch<React.SetStateAction<number>>] {
  const [syncPoint, setSyncPoint] = useState(0);
  const targetCtx = useCanvasContext(syncTargetCanvas);
  useEffect((): void => {
    if (!toolbarState.zoomModeOn) {
      return;
    }
    syncToCanvas(targetCtx, canvasRef.current);
  }, [syncPoint, toolbarState.zoomModeOn]); // sync if syncPoint set or zoomMode activated
  return [setSyncPoint];
}

function syncToCanvas(
  targetCanvasContext: CanvasRenderingContext2D | null,
  sourceCanvas: HTMLCanvasElement | null
): void {
  if (targetCanvasContext && sourceCanvas) {
    targetCanvasContext.clearRect(
      0,
      0,
      targetCanvasContext.canvas.width,
      targetCanvasContext.canvas.height
    );
    targetCanvasContext.drawImage(sourceCanvas, 0, 0);
  }
}

function useCanvasContext(canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null {
  const context = useMemo((): CanvasRenderingContext2D | null => {
    if (canvas === null) {
      return null;
    }
    return canvas.getContext('2d');
  }, [canvas]);
  return context;
}

export function useZoomToolInitialSelection(
  isZoomCanvas: boolean,
  toolbarState: ToolbarState,
  canvasDispatch: React.Dispatch<CanvasStateAction>,
  toolState: ToolState,
  toolStateDispatch: React.Dispatch<Action>
): void {
  useEffect((): void => {
    if (isZoomCanvas) {
      return;
    }
    // switch active tool to zoomInitialPointSelection for next render cycle
    if (toolbarState.zoomModeOn) {
      toolStateDispatch({ type: 'setActiveTool', tool: new ZoomInitialPointSelectorTool() });
    } else {
      canvasDispatch({
        type: 'setZoomFocusPoint',
        point: null,
      });
    }
  }, [toolbarState.zoomModeOn]);

  useEffect((): void => {
    canvasDispatch({
      type: 'setZoomFocusPoint',
      point: toolState.zoomToolState.zoomInitialPoint,
    });
    toolStateDispatch({ type: 'setActiveTool', tool: toolbarState.selectedTool });
  }, [toolState.zoomToolState.zoomInitialPoint]);
}

export function useScrollToFocusPoint(
  canvasDivRef: React.RefObject<HTMLDivElement>,
  focusPoint: Point | null,
  zoomFactor: number = 1
): void {
  useEffect((): void => {
    if (canvasDivRef === null || canvasDivRef.current === null) {
      return;
    }
    if (focusPoint === null) {
      return;
    }
    const scrollOptions = {
      left: focusPoint.x * zoomFactor - canvasDivRef.current.clientWidth / 2,
      top: focusPoint.y * zoomFactor - canvasDivRef.current.clientHeight / 2,
    };
    canvasDivRef.current.scrollTo(scrollOptions);
  }, [focusPoint]);
}

export function useUndo(
  undoState: UndoState,
  undoDispatch: React.Dispatch<UndoStateAction>,
  canvas: HTMLCanvasElement | null
): [() => void] {
  const ctx = useCanvasContext(canvas);

  // draw undo buffer state to canvas if user has clicked undo/redo
  useEffect((): void => {
    if (undoState.currentIndex === null) {
      return;
    }
    if (!ctx) {
      return;
    }
    clearCanvas(canvas, { r: 255, g: 255, b: 255 });
    var img = new Image();
    img.onload = function(): void {
      ctx.drawImage(img, 0, 0);
    };
    img.src = URL.createObjectURL(undoState.undoBuffer[undoState.currentIndex]);
  }, [undoState.lastUndoRedoTime]);

  // return a callback for setting an undo point
  const setUndoPoint = (): void => {
    if (!canvas) {
      return;
    }
    canvas.toBlob((blob): void => {
      if (blob === null) {
        return;
      }
      undoDispatch({ type: 'setUndoPoint', canvasAsBlob: blob });
    });
  };
  return [setUndoPoint];
}
