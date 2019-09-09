import { CanvasStateAction } from './CanvasState';
import { useEffect, useState } from 'react';
import ToolbarState from '../toolbar/ToolbarState';
import { ToolState, Action } from '../../tools/ToolState';
import { UndoState, UndoStateAction } from './UndoState';
import { ZoomInitialPointSelectorTool } from '../../tools/ZoomInitialPointSelectorTool';
import { Point } from '../../types';
import { clearCanvas } from '../../tools/util';

export function useCanvasSync(
  syncSourceCanvas: HTMLCanvasElement,
  syncTargetCanvas: HTMLCanvasElement,
  toolbarState: ToolbarState
): [React.Dispatch<React.SetStateAction<number>>] {
  const [syncPoint, setSyncPoint] = useState(0);
  useEffect((): void => {
    if (!toolbarState.zoomModeOn) {
      return;
    }
    copyToCanvas(syncSourceCanvas, syncTargetCanvas);
  }, [syncPoint, toolbarState.zoomModeOn]); // sync if sync point set or zoomMode activated
  // return a callback for setting a sync point
  return [setSyncPoint];
}

function copyToCanvas(sourceCanvas: HTMLCanvasElement, targetCanvas: HTMLCanvasElement): void {
  const targetContext = targetCanvas.getContext('2d');
  if (targetContext) {
    targetContext.clearRect(0, 0, targetContext.canvas.width, targetContext.canvas.height);
    targetContext.drawImage(sourceCanvas, 0, 0);
  }
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

export function useUndo(
  undoState: UndoState,
  undoDispatch: React.Dispatch<UndoStateAction>,
  canvas: HTMLCanvasElement
): [() => void] {
  // draw undo buffer state to canvas if user has clicked undo/redo
  useEffect((): void => {
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    if (undoState.currentIndex === null) {
      return;
    }
    clearCanvas(canvas, { r: 255, g: 255, b: 255 });
    const image = new Image();
    image.onload = function(): void {
      context.drawImage(image, 0, 0);
    };
    image.src = URL.createObjectURL(undoState.undoBuffer[undoState.currentIndex]);
  }, [undoState.lastUndoRedoTime]);

  // return a callback for setting an undo point
  const setUndoPoint = (): void => {
    canvas.toBlob((blob): void => {
      if (blob === null) {
        return;
      }
      undoDispatch({ type: 'setUndoPoint', canvasAsBlob: blob });
    });
  };
  return [setUndoPoint];
}
