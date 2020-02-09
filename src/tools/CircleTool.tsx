import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton, edgeToEdgeCrosshair } from './util';
import { distance } from '../algorithm/draw';
import { overmind } from '../index';

export class CircleTool implements Tool {
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

    const origin = overmind.state.tool.circleTool.origin;
    if (!origin) {
      return;
    }

    const position = getMousePos(canvas, event);
    const radius = Math.round(distance(origin, position));

    if (this.filled) {
      overmind.state.brush.brush.drawFilledCircle(
        canvas,
        origin,
        radius,
        isRightMouseButton(event),
        overmind.state
      );
    } else {
      overmind.state.brush.brush.drawUnfilledCircle(
        canvas,
        origin,
        radius,
        isRightMouseButton(event),
        overmind.state
      );
    }
    undoPoint();
    onPaint();
    overmind.actions.tool.circleToolOrigin(null);
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;
    const mousePos = getMousePos(canvas, event);
    overmind.actions.tool.circleToolOrigin(mousePos);
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    overmind.actions.tool.circleToolOrigin(null);
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onPaint } = params;
    const position = getMousePos(canvas, event);
    clearOverlayCanvas(canvas);

    const origin = overmind.state.tool.circleTool.origin;
    if (!origin) {
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

    let radius = Math.round(distance(origin, position));
    if (this.filled) {
      overmind.state.brush.brush.drawFilledCircle(
        canvas,
        origin,
        radius,
        isRightMouseButton(event),
        overmind.state
      );
    } else {
      overmind.state.brush.brush.drawUnfilledCircle(
        canvas,
        origin,
        radius,
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
