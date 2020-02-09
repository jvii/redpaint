import { Tool, EventHandlerParamsWithEvent } from './Tool';
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
    const { event, canvas, onDrawToCanvas, undoPoint } = params;

    //if (!toolState.circleToolState.startingPosition) {
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
    onDrawToCanvas();
    //toolStateDispatch({ type: 'circleToolStart', point: null });
    overmind.actions.tool.circleToolOrigin(null);
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;
    const position = getMousePos(canvas, event);
    //toolStateDispatch({ type: 'circleToolStart', point: position });
    overmind.actions.tool.circleToolOrigin(position);
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    overmind.actions.tool.circleToolOrigin(null);
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onDrawToCanvas } = params;
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
      onDrawToCanvas();
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
    onDrawToCanvas();
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }

  public onMouseUpOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}
