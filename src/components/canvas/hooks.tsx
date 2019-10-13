import { useEffect } from 'react';
import { ToolState } from '../../tools/ToolState';
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
  }, [toolState.brushSelectorState.dataURL]);
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
