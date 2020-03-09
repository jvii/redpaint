import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, edgeToEdgeCrosshair, isRightMouseButton } from './util';
import { distance } from '../algorithm/draw';
import { Throttle } from './Throttle';
import { overmind } from '../index';

export class CircleTool implements Tool {
  private throttle = new Throttle(50);

  public constructor(filled: boolean) {
    this.filled = filled;
  }

  private filled: boolean;

  public reset(canvas: HTMLCanvasElement): void {
    overmind.actions.canvas.storeInvertedCanvas(canvas);
    overmind.actions.tool.circleToolOrigin(null);
    overmind.actions.tool.activeToolToFGFillStyle();
    overmind.actions.brush.toFGBrush();
  }

  public prepare(withBGColor: boolean): void {
    if (withBGColor) {
      overmind.actions.tool.activeToolToBGFillStyle();
      overmind.actions.brush.toBGBrush();
    }
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

    const origin = overmind.state.tool.circleTool.origin;
    if (!origin) {
      return;
    }

    const mousePos = getMousePos(canvas, event);
    const radius = Math.round(distance(origin, mousePos));

    if (this.filled) {
      overmind.state.brush.brush.drawFilledCircle(ctx, origin, radius);
    } else {
      overmind.state.brush.brush.drawUnfilledCircle(ctx, origin, radius);
    }
    undoPoint();
    onPaint();
    this.reset(canvas);
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;
    this.prepare(isRightMouseButton(event));
    const mousePos = getMousePos(canvas, event);
    overmind.actions.tool.circleToolOrigin(mousePos);
  }

  public onMouseEnter(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;
    if (!event.buttons) {
      this.reset(canvas);
    }
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
      onPaint,
    } = params;

    const mousePos = getMousePos(canvas, event);

    const origin = overmind.state.tool.circleTool.origin;
    if (!origin) {
      clearOverlayCanvas(canvas);
      if (!this.filled) {
        // DPaint only draws unfilled shapes with the current brush
        overmind.state.brush.brush.drawDot(ctx, mousePos);
      }
      edgeToEdgeCrosshair(ctx, mousePos);
      onPaint();
      return;
    }

    let radius = Math.round(distance(origin, mousePos));
    if (this.filled) {
      this.throttle.call((): void => {
        clearOverlayCanvas(canvas);
        overmind.state.brush.brush.drawFilledCircle(ctx, origin, radius);
      });
    } else {
      this.throttle.call((): void => {
        clearOverlayCanvas(canvas);
        overmind.state.brush.brush.drawUnfilledCircle(ctx, origin, radius);
      });
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
