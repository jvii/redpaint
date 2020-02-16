import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, edgeToEdgeCrosshair } from './util';
import { overmind } from '../index';

export class RectangleTool implements Tool {
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

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
      onPaint,
      undoPoint,
    } = params;

    const startPoint = overmind.state.tool.rectangleTool.start;
    if (!startPoint) {
      return;
    }

    const endPoint = getMousePos(canvas, event);

    if (this.filled) {
      overmind.state.brush.brush.drawFilledRect(ctx, startPoint, endPoint);
    } else {
      overmind.state.brush.brush.drawUnfilledRect(ctx, startPoint, endPoint);
    }
    undoPoint();
    onPaint();
    this.onInit(canvas);
    overmind.actions.tool.rectangleToolStart(null);
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;
    const position = getMousePos(canvas, event);
    overmind.actions.tool.rectangleToolStart(position);
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    overmind.actions.tool.rectangleToolStart(null);
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

    const position = getMousePos(canvas, event);

    const startPoint = overmind.state.tool.rectangleTool.start;
    if (!startPoint) {
      if (!this.filled) {
        // DPaint only draws unfilled shapes with the current brush
        overmind.state.brush.brush.drawDot(ctx, position);
      }
      edgeToEdgeCrosshair(canvas, position);
      onPaint();
      return;
    }

    if (this.filled) {
      overmind.state.brush.brush.drawFilledRect(ctx, startPoint, position);
    } else {
      overmind.state.brush.brush.drawUnfilledRect(ctx, startPoint, position);
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

  public onMouseUpOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx: { canvas },
      onPaint,
    } = params;
    clearOverlayCanvas(canvas);
    onPaint();
  }
}
