import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas } from './util';

export class ZoomInitialPointSelectorTool implements Tool {
  public onClick(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolStateDispatch } = params;
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    toolStateDispatch({ type: 'zoomInitialPoint', point: position });
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);

    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      return;
    }
    clearOverlayCanvas(canvas);
    ctx.strokeRect(position.x - 30, position.y - 30, 60, 60);
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}
