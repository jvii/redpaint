import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas } from './util';
import { overmind } from '../index';

export class ZoomInitialPointSelectorTool implements Tool {
  public onClick(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;
    const mousePos = getMousePos(canvas, event);
    overmind.actions.canvas.setZoomFocusPoint(mousePos);
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  // Overlay

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const { event, canvas, onPaint } = params;
    clearOverlayCanvas(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const mousePos = getMousePos(canvas, event);
    ctx.strokeRect(mousePos.x - 30, mousePos.y - 30, 60, 60);
    onPaint();
  }

  public onMouseLeaveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const { canvas, onPaint } = params;
    clearOverlayCanvas(canvas);
    onPaint();
  }

  public onClickOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const { canvas, onPaint } = params;
    clearOverlayCanvas(canvas);
    onPaint();
  }
}
