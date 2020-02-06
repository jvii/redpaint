import { Tool, EventHandlerParamsWithEvent, OnInitParams } from './Tool';
import {
  getMousePos,
  clearOverlayCanvas,
  isLeftMouseButton,
  isRightMouseButton,
  edgeToEdgeCrosshair,
} from './util';

export class EllipseTool implements Tool {
  public constructor(filled: boolean) {
    this.filled = filled;
  }

  private filled: boolean;

  public onInit(params: OnInitParams): void {
    const { canvas, toolStateDispatch } = params;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = canvas.width;
    bufferCanvas.height = canvas.height;
    const bufferCanvasCtx = bufferCanvas.getContext('2d');
    if (!bufferCanvasCtx) {
      return;
    }
    bufferCanvasCtx.filter = 'invert(1)';
    bufferCanvasCtx.drawImage(canvas, 0, 0);
    bufferCanvasCtx.globalCompositeOperation = 'difference';
    bufferCanvasCtx.fillStyle = 'white';
    bufferCanvasCtx.globalAlpha = 1; // alpha 0 = no effect 1 = full effect
    bufferCanvasCtx.fillRect(0, 0, bufferCanvas.width, bufferCanvas.height);

    const pattern = bufferCanvasCtx.createPattern(bufferCanvas, 'no-repeat');
    if (pattern) {
      console.log('pattern updated');
      toolStateDispatch({
        type: 'invertedCanvasPattern',
        invertedCanvasPattern: pattern,
      });
    }
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolState, toolStateDispatch } = params;

    // Do nothing if center point not set, or radius not yet set

    if (!toolState.ellipseToolState.centerPoint) {
      return;
    }
    if (!toolState.ellipseToolState.radiusX || !toolState.ellipseToolState.radiusY) {
      return;
    }

    // Change rotation angle if left mouse button down, otherwise re-adjust radius

    const position = getMousePos(canvas, event);

    if (isLeftMouseButton(event)) {
      const rotationAngle =
        position.y - toolState.ellipseToolState.centerPoint.y - toolState.ellipseToolState.radiusY;
      toolStateDispatch({
        type: 'ellipseToolRotationAngle',
        angle: rotationAngle,
      });
    } else {
      const radiusX = Math.abs(position.x - toolState.ellipseToolState.centerPoint.x);
      const radiusY = Math.abs(position.y - toolState.ellipseToolState.centerPoint.y);
      toolStateDispatch({
        type: 'ellipseToolRadius',
        radius: { radiusX: radiusX, radiusY: radiusY },
      });
    }
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

    if (!toolState.ellipseToolState.centerPoint) {
      return;
    }

    // If radius has not been set, set it and return

    if (!toolState.ellipseToolState.radiusX || !toolState.ellipseToolState.radiusY) {
      const position = getMousePos(canvas, event);
      const radiusX = Math.abs(position.x - toolState.ellipseToolState.centerPoint.x);
      const radiusY = Math.abs(position.y - toolState.ellipseToolState.centerPoint.y);
      toolStateDispatch({
        type: 'ellipseToolRadius',
        radius: { radiusX: radiusX, radiusY: radiusY },
      });
      return;
    }

    // Draw ellipse

    if (this.filled) {
      state.brush.brush.drawFilledEllipse(
        canvas,
        toolState.ellipseToolState.centerPoint,
        toolState.ellipseToolState.radiusX,
        toolState.ellipseToolState.radiusY,
        toolState.ellipseToolState.rotationAngle,
        isRightMouseButton(event),
        state
      );
    } else {
      state.brush.brush.drawUnfilledEllipse(
        canvas,
        toolState.ellipseToolState.centerPoint,
        toolState.ellipseToolState.radiusX,
        toolState.ellipseToolState.radiusY,
        toolState.ellipseToolState.rotationAngle,
        isRightMouseButton(event),
        state
      );
    }
    undoPoint();
    onDrawToCanvas();
    this.onInit({ canvas, toolState, toolStateDispatch });

    toolStateDispatch({ type: 'ellipseToolReset' });
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolState, toolStateDispatch } = params;
    const position = getMousePos(canvas, event);
    if (!toolState.ellipseToolState.centerPoint) {
      toolStateDispatch({ type: 'ellipseToolCenter', point: position });
    }
  }

  // TODO: check how DPaint handles this
  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    const { toolStateDispatch } = params;
    toolStateDispatch({ type: 'ellipseToolReset' });
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, state, toolState, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    const position = getMousePos(canvas, event);

    if (!toolState.ellipseToolState.centerPoint) {
      if (!this.filled) {
        // DPaint only draws unfilled shapes with the current brush
        state.brush.brush.drawDot(canvas, position, isRightMouseButton(event), state);
      }
      edgeToEdgeCrosshair(canvas, position, toolState);
      onDrawToCanvas();
      return;
    }

    const radiusX = Math.abs(position.x - toolState.ellipseToolState.centerPoint.x);
    const radiusY = Math.abs(position.y - toolState.ellipseToolState.centerPoint.y);

    if (this.filled) {
      state.brush.brush.drawFilledEllipse(
        canvas,
        toolState.ellipseToolState.centerPoint,
        toolState.ellipseToolState.radiusX ? toolState.ellipseToolState.radiusX : radiusX,
        toolState.ellipseToolState.radiusY ? toolState.ellipseToolState.radiusY : radiusY,
        toolState.ellipseToolState.rotationAngle,
        isRightMouseButton(event),
        state
      );
    } else {
      state.brush.brush.drawUnfilledEllipse(
        canvas,
        toolState.ellipseToolState.centerPoint,
        toolState.ellipseToolState.radiusX ? toolState.ellipseToolState.radiusX : radiusX,
        toolState.ellipseToolState.radiusY ? toolState.ellipseToolState.radiusY : radiusY,
        toolState.ellipseToolState.rotationAngle,
        isRightMouseButton(event),
        state
      );
    }
    onDrawToCanvas();
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}
