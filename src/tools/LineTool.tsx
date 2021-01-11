/* eslint-disable no-undef */
import {
  Tool,
  EventHandlerParamsWithEvent,
  OverlayEventHandlerParamsWithEvent,
  EventHandlerParams,
} from './Tool';
import {
  getMousePos,
  clearOverlayCanvas,
  isRightMouseButton,
  isLeftMouseButton,
  omit,
} from './util/util';
import { Throttle } from './util/Throttle';
import { overmind } from '../index';
import { brushHistory } from '../brush/BrushHistory';

export class LineTool implements Tool {
  private throttle = new Throttle(50);

  private prepareToPaint(withBGColor: boolean): void {
    if (withBGColor) {
      overmind.actions.tool.activeToolToBGFillStyle();
      overmind.actions.brush.toBGBrush();
    }
  }

  public onInit(params: EventHandlerParams): void {
    overmind.actions.tool.lineToolStart(null);
    overmind.actions.tool.activeToolToFGFillStyle();
    overmind.actions.brush.toFGBrush();
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
    brushHistory.current.drawLine(ctx, start, end);
    undoPoint();
    onPaint();
    this.onInit(omit(params, 'event'));
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;
    this.prepareToPaint(isRightMouseButton(event));
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
        brushHistory.current.drawLine(ctx, start, end);
      });
    } else {
      clearOverlayCanvas(canvas);
      brushHistory.current.drawDot(ctx, mousePos);
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
