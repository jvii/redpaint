import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas } from './util';

export class EllipseTool implements Tool {
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

    // If radius has not been set, set it and return
    if (
      toolState.ellipseToolState.centerPoint !== null &&
      toolState.ellipseToolState.radiusX === 0 &&
      toolState.ellipseToolState.radiusY === 0
    ) {
      const position = getMousePos(canvas, event);
      const radiusX = Math.abs(position.x - toolState.ellipseToolState.centerPoint.x);
      const radiusY = Math.abs(position.y - toolState.ellipseToolState.centerPoint.y);
      toolStateDispatch({
        type: 'ellipseToolRadius',
        radius: { radiusX: radiusX, radiusY: radiusY },
      });
      return;
    }

    // If center point and radius has been set, draw the ellipse with current rotation
    if (
      toolState.ellipseToolState.centerPoint !== null &&
      toolState.ellipseToolState.radiusX > 0 &&
      toolState.ellipseToolState.radiusY > 0
    ) {
      const position = getMousePos(canvas, event);
      const rotationAngle =
        position.y - toolState.ellipseToolState.centerPoint.y - toolState.ellipseToolState.radiusY;

      if (this.filled) {
        state.brush.brush.drawFilledEllipse(
          canvas,
          toolState.ellipseToolState.centerPoint,
          toolState.ellipseToolState.radiusX,
          toolState.ellipseToolState.radiusY,
          rotationAngle,
          isRightMouseButton(event),
          state
        );
      } else {
        state.brush.brush.drawUnfilledEllipse(
          canvas,
          toolState.ellipseToolState.centerPoint,
          toolState.ellipseToolState.radiusX,
          toolState.ellipseToolState.radiusY,
          rotationAngle,
          isRightMouseButton(event),
          state
        );
      }
      undoPoint();
      onDrawToCanvas();
      toolStateDispatch({ type: 'ellipseToolCenter', point: null });
      toolStateDispatch({
        type: 'ellipseToolRadius',
        radius: { radiusX: 0, radiusY: 0 },
      });
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolState, toolStateDispatch } = params;
    const position = getMousePos(canvas, event);
    if (toolState.ellipseToolState.centerPoint === null) {
      toolStateDispatch({ type: 'ellipseToolCenter', point: position });
    }
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, state, toolState, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);

    // If radius has not been set, draw ellipse with no rotation
    if (
      toolState.ellipseToolState.centerPoint !== null &&
      toolState.ellipseToolState.radiusX === 0 &&
      toolState.ellipseToolState.radiusY === 0
    ) {
      const position = getMousePos(canvas, event);
      const radiusX = Math.abs(position.x - toolState.ellipseToolState.centerPoint.x);
      const radiusY = Math.abs(position.y - toolState.ellipseToolState.centerPoint.y);
      if (this.filled) {
        state.brush.brush.drawFilledEllipse(
          canvas,
          toolState.ellipseToolState.centerPoint,
          radiusX,
          radiusY,
          0,
          isRightMouseButton(event),
          state
        );
      } else {
        state.brush.brush.drawUnfilledEllipse(
          canvas,
          toolState.ellipseToolState.centerPoint,
          radiusX,
          radiusY,
          0,
          isRightMouseButton(event),
          state
        );
      }
      onDrawToCanvas();
    }

    // If center point and radius has been set, draw the ellipse with current rotation
    if (
      toolState.ellipseToolState.centerPoint !== null &&
      toolState.ellipseToolState.radiusX > 0 &&
      toolState.ellipseToolState.radiusY > 0
    ) {
      const position = getMousePos(canvas, event);
      const rotationAngle =
        position.y - toolState.ellipseToolState.centerPoint.y - toolState.ellipseToolState.radiusY;

      if (this.filled) {
        state.brush.brush.drawFilledEllipse(
          canvas,
          toolState.ellipseToolState.centerPoint,
          toolState.ellipseToolState.radiusX,
          toolState.ellipseToolState.radiusY,
          rotationAngle,
          isRightMouseButton(event),
          state
        );
      } else {
        state.brush.brush.drawUnfilledEllipse(
          canvas,
          toolState.ellipseToolState.centerPoint,
          toolState.ellipseToolState.radiusX,
          toolState.ellipseToolState.radiusY,
          rotationAngle,
          isRightMouseButton(event),
          state
        );
      }
      onDrawToCanvas();
    }
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}

// Helpers

function isRightMouseButton(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): boolean {
  return event.button === 2 || event.buttons === 2;
}
