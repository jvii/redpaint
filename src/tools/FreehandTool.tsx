import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton } from './util';
import { overmind } from '../index';

export class FreehandTool implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onPaint } = params;

    if (event.buttons && overmind.state.tool.freehandTool.previous) {
      const mousePos = getMousePos(canvas, event);
      const start = overmind.state.tool.freehandTool.previous;
      const end = mousePos;
      overmind.state.brush.brush.drawLine(
        canvas,
        start,
        end,
        isRightMouseButton(event),
        overmind.state
      );
      overmind.actions.tool.freeHandToolPrevious(mousePos);
      onPaint();
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onPaint } = params;
    const position = getMousePos(canvas, event);
    overmind.state.brush.brush.drawDot(canvas, position, isRightMouseButton(event), overmind.state);
    overmind.actions.tool.freeHandToolPrevious(position);
    onPaint();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { undoPoint } = params;
    overmind.actions.tool.freeHandToolPrevious(null);
    undoPoint();
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    overmind.actions.tool.freeHandToolPrevious(null);
  }

  public onMouseEnter(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;
    const position = getMousePos(canvas, event);
    overmind.actions.tool.freeHandToolPrevious(position);
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onPaint } = params;
    if (event.buttons) {
      return;
    }
    clearOverlayCanvas(canvas);
    const position = getMousePos(canvas, event);
    overmind.state.brush.brush.drawDot(canvas, position, isRightMouseButton(event), overmind.state);
    onPaint();
  }

  public onMouseDownOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const { canvas, onPaint: onPaint } = params;
    clearOverlayCanvas(canvas);
    onPaint();
  }

  public onMouseLeaveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const { canvas, onPaint: onPaint } = params;
    clearOverlayCanvas(canvas);
    onPaint();
  }
}
