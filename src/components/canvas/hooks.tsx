import { useEffect } from 'react';
import { ToolState, Action } from '../../tools/ToolState';
import { useOvermind } from '../../overmind';
import { Point } from '../../types';
import { CustomBrush } from '../../brush/CustomBrush';

export function useZoomFocusPointSelection(toolState: ToolState): void {
  const { actions } = useOvermind();
  useEffect((): void => {
    actions.canvas.setZoomFocusPoint(toolState.zoomToolState.zoomInitialPoint);
  }, [toolState.zoomToolState.zoomInitialPoint]);
}

export function useBrushSelection(toolState: ToolState): void {
  const { actions } = useOvermind();
  useEffect((): void => {
    if (!toolState.brushSelectorState.dataURL) {
      return;
    }
    const brush = new CustomBrush(toolState.brushSelectorState.dataURL);
    actions.brush.setBrush(brush);
    actions.toolbar.toggleBrushSelectionMode();
    // switch to Freehand tool after selection for simplicity (what does DPaint do?)
    actions.toolbar.setSelectedDrawingTool('freeHand');
  }, [toolState.brushSelectorState.dataURL]);
}

export function useInitTool(
  canvas: HTMLCanvasElement,
  toolState: ToolState,
  toolStateDispatch: React.Dispatch<Action>,
  isZoomCanvas: boolean
): void {
  const { state, actions } = useOvermind();
  useEffect((): void => {
    if (typeof state.toolbar.activeTool.onInit !== 'undefined') {
      console.log('init');
      state.toolbar.activeTool.onInit({ canvas, toolState, toolStateDispatch });
    }
  }, [state.toolbar.activeTool]);
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
