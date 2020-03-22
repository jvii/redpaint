import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import {
  getMousePos,
  clearOverlayCanvas,
  isRightMouseButton,
  isLeftOrRightMouseButton,
} from './util';
import { overmind } from '../index';
//import { brushHistory } from '../brush/BrushHistory';

export class FreehandTool implements Tool {
  private prepareToPaint(withBGColor: boolean): void {
    if (withBGColor) {
      overmind.actions.tool.activeToolToBGFillStyle();
      overmind.actions.brush.toBGBrush();
    }
  }

  public onInit(canvas: HTMLCanvasElement): void {
    overmind.actions.tool.freeHandToolPrevious(null);
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
      ctx,
      ctx: { canvas },
      onPaint,
    } = params;

    if (event.buttons && overmind.state.tool.freehandTool.previous) {
      const mousePos = getMousePos(canvas, event);
      const start = overmind.state.tool.freehandTool.previous;
      const end = mousePos;
      overmind.state.brush.brush.drawLine(ctx, start, end);
      //brushHistory.current.drawLine(ctx, start, end);
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
    this.prepareToPaint(isRightMouseButton(event));
    overmind.state.brush.brush.drawDot(ctx, mousePos);
    //brushHistory.current.drawDot(ctx, mousePos);
    overmind.actions.tool.freeHandToolPrevious(mousePos);
    onPaint();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { ctx, undoPoint } = params;
    this.onInit(ctx.canvas);
    undoPoint();
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    const {
      ctx: { canvas },
    } = params;
    this.onInit(canvas);
  }

  public onMouseEnter(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;
    if (isLeftOrRightMouseButton(event)) {
      this.prepareToPaint(isRightMouseButton(event));
      const mousePos = getMousePos(canvas, event);
      overmind.actions.tool.freeHandToolPrevious(mousePos);
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
    //brushHistory.current.drawDot(ctx, mousePos);
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
