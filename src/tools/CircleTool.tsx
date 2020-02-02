import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton } from './util';
import { distance } from '../algorithm/draw';

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
    const {
      event,
      canvas,
      state,
      onDrawToCanvas,
      toolState,
      toolStateDispatch,
      undoPoint,
    } = params;

    if (toolState.circleToolState.startingPosition) {
      const position = getMousePos(canvas, event);
      let radius = Math.round(distance(toolState.circleToolState.startingPosition, position));

      if (this.filled) {
        state.brush.brush.drawFilledCircle(
          canvas,
          toolState.circleToolState.startingPosition,
          radius,
          isRightMouseButton(event),
          state
        );
      } else {
        state.brush.brush.drawUnfilledCircle(
          canvas,
          toolState.circleToolState.startingPosition,
          radius,
          isRightMouseButton(event),
          state
        );
      }

      undoPoint();
      onDrawToCanvas();
      toolStateDispatch({ type: 'circleToolStart', point: null });
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolStateDispatch } = params;
    const position = getMousePos(canvas, event);
    toolStateDispatch({ type: 'circleToolStart', point: position });
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    const { toolStateDispatch } = params;
    toolStateDispatch({ type: 'circleToolStart', point: null });
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, state, toolState, onDrawToCanvas } = params;
    const position = getMousePos(canvas, event);
    clearOverlayCanvas(canvas);

    if (toolState.circleToolState.startingPosition) {
      let radius = Math.round(distance(toolState.circleToolState.startingPosition, position));
      if (this.filled) {
        state.brush.brush.drawFilledCircle(
          canvas,
          toolState.circleToolState.startingPosition,
          radius,
          isRightMouseButton(event),
          state
        );
      } else {
        state.brush.brush.drawUnfilledCircle(
          canvas,
          toolState.circleToolState.startingPosition,
          radius,
          isRightMouseButton(event),
          state
        );
      }
    } else {
      if (!this.filled) {
        // DPaint doesn't draw filled shapes with the actual brush
        state.brush.brush.drawDot(canvas, position, isRightMouseButton(event), state);
      }
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
