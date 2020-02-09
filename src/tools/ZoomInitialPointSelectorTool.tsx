import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas } from './util';
import { overmind } from '../index';

export class ZoomInitialPointSelectorTool implements Tool {
  public onClick(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;
    const mousePos = getMousePos(canvas, event);
    //toolStateDispatch({ type: 'zoomInitialPoint', point: mousePos });
    overmind.actions.canvas.setZoomFocusPoint(mousePos);
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    clearOverlayCanvas(canvas);
    const mousePos = getMousePos(canvas, event);
    ctx.strokeRect(mousePos.x - 30, mousePos.y - 30, 60, 60);
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas } = params;
    clearOverlayCanvas(canvas);
  }

  public onClickOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas } = params;
    clearOverlayCanvas(canvas);
  }
}
