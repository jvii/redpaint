import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import {
  getMousePos,
  clearOverlayCanvas,
  isRightMouseButton,
  isLeftOrRightMouseButton,
} from './util';
import { overmind } from '../index';

export class AirbrushTool implements Tool {
  private timeout: number = 0;

  private prepareToPaint(withBGColor: boolean): void {
    if (withBGColor) {
      overmind.actions.tool.activeToolToBGFillStyle();
      overmind.actions.brush.toBGBrush();
    }
  }

  public onInit(canvas: HTMLCanvasElement): void {
    overmind.actions.tool.activeToolToFGFillStyle();
    overmind.actions.brush.toFGBrush();
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

    const mousePos = getMousePos(canvas, event);
    overmind.actions.tool.airbrushToolPosition(mousePos);
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, ctx, onPaint } = params;

    const draw = (ctx: CanvasRenderingContext2D, onPaint: Function): void => {
      for (let i = 50; i--; ) {
        var angle = getRandomFloat(0, Math.PI * 2);
        var radius = getRandomFloat(0, 20);
        if (overmind.state.tool.airbrushTool.position) {
          overmind.state.brush.brush.drawDot(ctx, {
            x: overmind.state.tool.airbrushTool.position.x + radius * Math.cos(angle),
            y: overmind.state.tool.airbrushTool.position.y + radius * Math.sin(angle),
          });
        }
      }
      onPaint();
      this.timeout = setTimeout(draw, 20, ctx, onPaint);
    };

    this.prepareToPaint(isRightMouseButton(event));
    this.timeout = setTimeout(draw, 20, ctx, onPaint);
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { ctx, undoPoint } = params;
    clearTimeout(this.timeout);
    this.onInit(ctx.canvas);
    undoPoint();
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
      undoPoint,
    } = params;
    clearTimeout(this.timeout);
    this.onInit(canvas);
    if (isLeftOrRightMouseButton(event)) {
      undoPoint();
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
    if (event.buttons) {
      return;
    }
    clearOverlayCanvas(canvas);

    const mousePos = getMousePos(canvas, event);
    overmind.state.brush.brush.drawDot(ctx, mousePos);
    onPaint();
  }

  public onMouseDownOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx: { canvas },
      onPaint,
    } = params;
    clearOverlayCanvas(canvas);
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

function getRandomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
