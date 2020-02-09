import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton, isLeftMouseButton } from './util';
import { overmind } from '../index';

export class LineTool implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onPaint, undoPoint } = params;

    if (!overmind.state.tool.lineTool.start) {
      return;
    }

    const position = getMousePos(canvas, event);
    const start = overmind.state.tool.lineTool.start;
    const end = position;
    overmind.state.brush.brush.drawLine(
      canvas,
      start,
      end,
      isRightMouseButton(event),
      overmind.state
    );
    undoPoint();
    onPaint();
    overmind.actions.tool.lineToolStart(null);
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;
    const position = getMousePos(canvas, event);
    overmind.actions.tool.lineToolStart(position);
  }

  // Overlay

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const { event, canvas, onPaint } = params;
    const position = getMousePos(canvas, event);

    clearOverlayCanvas(canvas);
    if (overmind.state.tool.lineTool.start && isLeftMouseButton(event)) {
      const start = overmind.state.tool.lineTool.start;
      const end = position;
      overmind.state.brush.brush.drawLine(
        canvas,
        start,
        end,
        isRightMouseButton(event),
        overmind.state
      );
    } else {
      overmind.state.brush.brush.drawDot(
        canvas,
        position,
        isRightMouseButton(event),
        overmind.state
      );
    }
    onPaint();
  }

  public onMouseLeaveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const { canvas, onPaint } = params;
    clearOverlayCanvas(canvas);
    onPaint();
  }
}
