import { CanvasState, CanvasStateAction } from './CanvasState';
import { useRef, useEffect, useState, useMemo } from 'react';
import ToolbarState from '../toolbar/ToolbarState';
import { ToolState, Action } from '../../tools/ToolState';
import { ZoomInitialPointSelectorTool } from '../../tools/ZoomInitialPointSelectorTool';

export function useCanvasRef(
  canvasDispatch: React.Dispatch<CanvasStateAction>,
  isZoomCanvas: boolean
): [React.RefObject<HTMLCanvasElement>] {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect((): void => {
    if (!canvasRef.current) {
      return;
    }
    canvasDispatch({
      type: isZoomCanvas ? 'setZoomCanvasRef' : 'setMainCanvasRef',
      canvas: canvasRef.current,
    });
  }, [canvasRef, canvasDispatch, isZoomCanvas]);
  return [canvasRef];
}

export function useSyncToTargetCanvas(
  isZoomCanvas: boolean,
  toolbarState: ToolbarState,
  canvasState: CanvasState,
  sourceCanvas: HTMLCanvasElement | null
): React.Dispatch<React.SetStateAction<number>>[] {
  const [syncPoint, setSyncPoint] = useState(0);
  const syncTargetCanvas = isZoomCanvas ? canvasState.mainCanvasRef : canvasState.zoomCanvasRef;
  const syncTargetCanvasContext = useMemo((): CanvasRenderingContext2D | null => {
    if (syncTargetCanvas === null) {
      return null;
    }
    return syncTargetCanvas.getContext('2d');
  }, [syncTargetCanvas]);
  useEffect((): void => {
    if (!toolbarState.zoomModeOn) {
      return;
    }
    syncToCanvas(syncTargetCanvasContext, sourceCanvas);
  }, [syncPoint, toolbarState.zoomModeOn]); // sync if syncPoint set or zoomMode activated
  return [setSyncPoint];
}

function syncToCanvas(
  targetCanvasContext: CanvasRenderingContext2D | null,
  sourceCanvas: HTMLCanvasElement | null
): void {
  if (targetCanvasContext && sourceCanvas) {
    targetCanvasContext.drawImage(sourceCanvas, 0, 0);
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
