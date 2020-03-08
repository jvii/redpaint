import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, colorToRGBString, isRightMouseButton } from './util';
import { overmind } from '../index';

export class FreehandTool implements Tool {
  public reset(canvas: HTMLCanvasElement): void {
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

  public onMouseMove(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
      onPaint,
    } = params;

    if (event.buttons && overmind.state.tool.freehandTool.previous) {
      const mousePos = getMousePos(canvas, event);
      const start = overmind.state.tool.freehandTool.previous;
      const end = mousePos;
      overmind.state.brush.brush.drawLine(ctx, start, end);
      overmind.actions.tool.freeHandToolPrevious(mousePos);
      onPaint();
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
      onPaint,
    } = params;

    const mousePos = getMousePos(canvas, event);
    this.prepare(isRightMouseButton(event));
    overmind.state.brush.brush.drawDot(ctx, mousePos);
    overmind.actions.tool.freeHandToolPrevious(mousePos);
    onPaint();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { ctx, undoPoint } = params;
    this.reset(ctx.canvas);
    overmind.actions.tool.freeHandToolPrevious(null);
    undoPoint();
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    overmind.actions.tool.freeHandToolPrevious(null);
  }

  public onMouseEnter(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;
    const mousePos = getMousePos(canvas, event);
    overmind.actions.tool.freeHandToolPrevious(mousePos);
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
