import { useEffect } from 'react';
import { ToolState, Action } from '../../tools/ToolState';
import { ZoomInitialPointSelectorTool } from '../../tools/ZoomInitialPointSelectorTool';
import { useOvermind } from '../../overmind';
import { Point } from '../../types';

export function useZoomToolInitialSelection(
  isZoomCanvas: boolean,
  toolState: ToolState,
  toolStateDispatch: React.Dispatch<Action>
): void {
  const { state, actions } = useOvermind();
  useEffect((): void => {
    if (isZoomCanvas) {
      return;
    }
    // switch active tool to zoomInitialPointSelection for next render cycle
    if (state.toolbar.zoomModeOn) {
      toolStateDispatch({ type: 'setActiveTool', tool: new ZoomInitialPointSelectorTool() });
    } else {
      actions.canvas.setZoomFocusPoint(null);
    }
  }, [state.toolbar.zoomModeOn]);

  useEffect((): void => {
    actions.canvas.setZoomFocusPoint(toolState.zoomToolState.zoomInitialPoint);
    toolStateDispatch({ type: 'setActiveTool', tool: state.toolbar.selectedTool });
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
