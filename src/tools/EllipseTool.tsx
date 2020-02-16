import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, isLeftMouseButton, edgeToEdgeCrosshair } from './util';
import { overmind } from '../index';

export class EllipseTool implements Tool {
  public constructor(filled: boolean) {
    this.filled = filled;
  }

  private filled: boolean;

  public onInit(canvas: HTMLCanvasElement): void {
    overmind.actions.canvas.storeInvertedCanvas(canvas);
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;

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
    } else {
      const radiusX = Math.abs(position.x - origin.x);
      const radiusY = Math.abs(position.y - origin.y);
      overmind.actions.tool.ellipseToolRadius({ x: radiusX, y: radiusY });
    }
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
      onPaint,
      undoPoint,
    } = params;

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
      return;
    }

    // Draw ellipse

    const angle = overmind.state.tool.ellipseTool.angle;
    if (this.filled) {
      overmind.state.brush.brush.drawFilledEllipse(ctx, origin, radiusX, radiusY, angle);
    } else {
      overmind.state.brush.brush.drawUnfilledEllipse(ctx, origin, radiusX, radiusY, angle);
    }
    undoPoint();
    onPaint();
    this.onInit(canvas);
    overmind.actions.tool.ellipseToolReset();
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;
    const mousePos = getMousePos(canvas, event);
    if (!overmind.state.tool.ellipseTool.origin) {
      overmind.actions.tool.ellipseToolOrigin(mousePos);
    }
  }

  // TODO: check how DPaint handles this
  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    overmind.actions.tool.ellipseToolReset();
  }

  // Overlay

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
      onPaint,
    } = params;
    clearOverlayCanvas(canvas);

    const mousePos = getMousePos(canvas, event);

    const origin = overmind.state.tool.ellipseTool.origin;
    if (!origin) {
      if (!this.filled) {
        // DPaint only draws unfilled shapes with the current brush
        overmind.state.brush.brush.drawDot(ctx, mousePos);
      }
      edgeToEdgeCrosshair(canvas, mousePos);
      onPaint();
      return;
    }

    const radiusX = overmind.state.tool.ellipseTool.radiusX;
    const radiusY = overmind.state.tool.ellipseTool.radiusY;
    const newRadiusX = Math.abs(mousePos.x - origin.x);
    const newRadiusY = Math.abs(mousePos.y - origin.y);
    const angle = overmind.state.tool.ellipseTool.angle;

    if (this.filled) {
      overmind.state.brush.brush.drawFilledEllipse(
        ctx,
        origin,
        radiusX ? radiusX : newRadiusX,
        radiusY ? radiusY : newRadiusY,
        angle
      );
    } else {
      overmind.state.brush.brush.drawUnfilledEllipse(
        ctx,
        origin,
        radiusX ? radiusX : newRadiusX,
        radiusY ? radiusY : newRadiusY,
        angle
      );
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
