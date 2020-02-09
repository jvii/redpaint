import { Tool, EventHandlerParamsWithEvent } from './Tool';
import {
  getMousePos,
  clearOverlayCanvas,
  isLeftMouseButton,
  isRightMouseButton,
  edgeToEdgeCrosshair,
} from './util';
import { overmind } from '../index';

export class EllipseTool implements Tool {
  public constructor(filled: boolean) {
    this.filled = filled;
  }

  private filled: boolean;

  public onInit(canvas: HTMLCanvasElement): void {
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
      /* toolStateDispatch({
        type: 'invertedCanvasPattern',
        invertedCanvasPattern: pattern,
      }); */
      overmind.actions.canvas.storeInvertedCanvas(pattern);
    }
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;

    // Do nothing if center point not set, or radius not yet set

    const origin = overmind.state.tool.ellipseTool.origin;
    if (!origin) {
      return;
    }
    if (!overmind.state.tool.ellipseTool.radiusX || !overmind.state.tool.ellipseTool.radiusY) {
      return;
    }

    // Change rotation angle if left mouse button down, otherwise re-adjust radius

    const position = getMousePos(canvas, event);

    if (isLeftMouseButton(event)) {
      const rotationAngle = position.y - origin.y - overmind.state.tool.ellipseTool.radiusY;
      overmind.actions.tool.ellipseToolAngle(rotationAngle);
      /*       toolStateDispatch({
        type: 'ellipseToolRotationAngle',
        angle: rotationAngle,
      }); */
    } else {
      const radiusX = Math.abs(position.x - origin.x);
      const radiusY = Math.abs(position.y - origin.y);
      overmind.actions.tool.ellipseToolRadius({ x: radiusX, y: radiusY });
      /*       toolStateDispatch({
        type: 'ellipseToolRadius',
        radius: { radiusX: radiusX, radiusY: radiusY },
      }); */
    }
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onDrawToCanvas, undoPoint } = params;

    const origin = overmind.state.tool.ellipseTool.origin;
    if (!origin) {
      return;
    }

    // If radius has not been set, set it and return

    const radiusX = overmind.state.tool.ellipseTool.radiusX;
    const radiusY = overmind.state.tool.ellipseTool.radiusY;
    if (!radiusX || !radiusY) {
      const mousePos = getMousePos(canvas, event);
      overmind.actions.tool.ellipseToolRadius({
        x: Math.abs(mousePos.x - origin.x),
        y: Math.abs(mousePos.y - origin.y),
      });
      /*       toolStateDispatch({
        type: 'ellipseToolRadius',
        radius: { radiusX: radiusX, radiusY: radiusY },
      }); */
      return;
    }

    // Draw ellipse

    const angle = overmind.state.tool.ellipseTool.angle;
    if (this.filled) {
      overmind.state.brush.brush.drawFilledEllipse(
        canvas,
        origin,
        radiusX,
        radiusY,
        angle,
        isRightMouseButton(event),
        overmind.state
      );
    } else {
      overmind.state.brush.brush.drawUnfilledEllipse(
        canvas,
        origin,
        radiusX,
        radiusY,
        angle,
        isRightMouseButton(event),
        overmind.state
      );
    }
    undoPoint();
    onDrawToCanvas();
    this.onInit(canvas);
    //toolStateDispatch({ type: 'ellipseToolReset' });
    overmind.actions.tool.ellipseToolReset();
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;
    const mousePos = getMousePos(canvas, event);
    if (!overmind.state.tool.ellipseTool.origin) {
      //toolStateDispatch({ type: 'ellipseToolCenter', point: mousePos });
      overmind.actions.tool.ellipseToolOrigin(mousePos);
    }
  }

  // TODO: check how DPaint handles this
  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    overmind.actions.tool.ellipseToolReset();
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    const mousePos = getMousePos(canvas, event);

    const origin = overmind.state.tool.ellipseTool.origin;
    if (!origin) {
      if (!this.filled) {
        // DPaint only draws unfilled shapes with the current brush
        overmind.state.brush.brush.drawDot(
          canvas,
          mousePos,
          isRightMouseButton(event),
          overmind.state
        );
      }
      edgeToEdgeCrosshair(canvas, mousePos);
      onDrawToCanvas();
      return;
    }

    const radiusX = overmind.state.tool.ellipseTool.radiusX;
    const radiusY = overmind.state.tool.ellipseTool.radiusY;
    const newRadiusX = Math.abs(mousePos.x - origin.x);
    const newRadiusY = Math.abs(mousePos.y - origin.y);
    const angle = overmind.state.tool.ellipseTool.angle;

    if (this.filled) {
      overmind.state.brush.brush.drawFilledEllipse(
        canvas,
        origin,
        radiusX ? radiusX : newRadiusX,
        radiusY ? radiusY : newRadiusY,
        angle,
        isRightMouseButton(event),
        overmind.state
      );
    } else {
      overmind.state.brush.brush.drawUnfilledEllipse(
        canvas,
        origin,
        radiusX ? radiusX : newRadiusX,
        radiusY ? radiusY : newRadiusY,
        angle,
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
}
