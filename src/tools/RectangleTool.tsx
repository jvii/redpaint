import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton, edgeToEdgeCrosshair } from './util';
import { overmind } from '../index';

export class RectangleTool implements Tool {
  public constructor(filled: boolean) {
    this.filled = filled;
  }

  private filled: boolean;

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onPaint, undoPoint } = params;

    const startPoint = overmind.state.tool.rectangleTool.start;
    if (!startPoint) {
      return;
    }

    const endPoint = getMousePos(canvas, event);

    if (this.filled) {
      overmind.state.brush.brush.drawFilledRect(
        canvas,
        startPoint,
        endPoint,
        isRightMouseButton(event),
        overmind.state
      );
    } else {
      overmind.state.brush.brush.drawUnfilledRect(
        canvas,
        startPoint,
        endPoint,
        isRightMouseButton(event),
        overmind.state
      );
    }
    undoPoint();
    onPaint();
    overmind.actions.tool.rectangleToolStart(null);
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;
    const position = getMousePos(canvas, event);
    overmind.actions.tool.rectangleToolStart(position);
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    overmind.actions.tool.rectangleToolStart(null);
  }

  // Overlay

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const { event, canvas, onPaint } = params;
    clearOverlayCanvas(canvas);

    const position = getMousePos(canvas, event);

    const startPoint = overmind.state.tool.rectangleTool.start;
    if (!startPoint) {
      if (!this.filled) {
        // DPaint only draws unfilled shapes with the current brush
        overmind.state.brush.brush.drawDot(
          canvas,
          position,
          isRightMouseButton(event),
          overmind.state
        );
      }
      edgeToEdgeCrosshair(canvas, position);
      onPaint();
      return;
    }

    if (this.filled) {
      overmind.state.brush.brush.drawFilledRect(
        canvas,
        startPoint,
        position,
        isRightMouseButton(event),
        overmind.state
      );
    } else {
      overmind.state.brush.brush.drawUnfilledRect(
        canvas,
        startPoint,
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

  public onMouseUpOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const { canvas, onPaint } = params;
    clearOverlayCanvas(canvas);
    onPaint();
  }
}
