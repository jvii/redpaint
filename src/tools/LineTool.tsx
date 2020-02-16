import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton, isLeftMouseButton } from './util';
import { overmind } from '../index';

export class LineTool implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
      onPaint,
      undoPoint,
    } = params;

    if (!overmind.state.tool.lineTool.start) {
      return;
    }

    const position = getMousePos(canvas, event);
    const start = overmind.state.tool.lineTool.start;
    const end = position;
    overmind.state.brush.brush.drawLine(ctx, start, end);
    undoPoint();
    onPaint();
    overmind.actions.tool.lineToolStart(null);
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;
    const position = getMousePos(canvas, event);
    overmind.actions.tool.lineToolStart(position);
  }

  // Overlay

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
      onPaint,
    } = params;
    const position = getMousePos(canvas, event);

    clearOverlayCanvas(canvas);
    if (
      overmind.state.tool.lineTool.start &&
      (isLeftMouseButton(event) || isRightMouseButton(event))
    ) {
      const start = overmind.state.tool.lineTool.start;
      const end = position;
      overmind.state.brush.brush.drawLine(ctx, start, end);
    } else {
      overmind.state.brush.brush.drawDot(ctx, position);
    }
    onPaint();
  }

  public onMouseLeaveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx: { canvas },
      onPaint,
    } = params;
    clearOverlayCanvas(canvas);
    onPaint();
  }
}
