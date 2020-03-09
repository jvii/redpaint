import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton, isLeftMouseButton } from './util';
import { Throttle } from './Throttle';
import { overmind } from '../index';

export class LineTool implements Tool {
  private throttle = new Throttle(50);

  public reset(canvas: HTMLCanvasElement): void {
    overmind.actions.tool.lineToolStart(null);
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

    if (!overmind.state.tool.lineTool.start) {
      return;
    }

    const mousePos = getMousePos(canvas, event);
    const start = overmind.state.tool.lineTool.start;
    const end = mousePos;
    overmind.state.brush.brush.drawLine(ctx, start, end);
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
    overmind.actions.tool.lineToolStart(mousePos);
  }

  // Overlay

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
      onPaint,
    } = params;
    const mousePos = getMousePos(canvas, event);

    if (
      overmind.state.tool.lineTool.start &&
      (isLeftMouseButton(event) || isRightMouseButton(event))
    ) {
      const start = overmind.state.tool.lineTool.start;
      const end = mousePos;
      this.throttle.call((): void => {
        clearOverlayCanvas(canvas);
        overmind.state.brush.brush.drawLine(ctx, start, end);
      });
    } else {
      clearOverlayCanvas(canvas);
      overmind.state.brush.brush.drawDot(ctx, mousePos);
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
