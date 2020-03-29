import {
  Tool,
  EventHandlerParamsWithEvent,
  OverlayEventHandlerParamsWithEvent,
  EventHandlerParams,
} from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton, omit } from './util/util';
import { distance } from '../algorithm/draw';
import { Throttle } from './util/Throttle';
import { overmind } from '../index';
import { selection } from './util/SelectionIndicator';

export class CircleTool implements Tool {
  public constructor(filled: boolean) {
    this.filled = filled;
  }
  private filled: boolean;
  private throttle = new Throttle(50);

  private prepareToPaint(withBGColor: boolean): void {
    if (withBGColor) {
      overmind.actions.tool.activeToolToBGFillStyle();
      overmind.actions.brush.toBGBrush();
    }
  }

  public onInit(params: EventHandlerParams): void {
    const {
      ctx: { canvas },
    } = params;
    selection.prepare(canvas);
    overmind.actions.tool.circleToolOrigin(null);
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
    this.onInit(omit(params, 'event'));
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;
    this.prepareToPaint(isRightMouseButton(event));
    const mousePos = getMousePos(canvas, event);
    overmind.actions.tool.circleToolOrigin(mousePos);
  }

  public onMouseEnter(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    if (!event.buttons) {
      this.onInit(omit(params, 'event'));
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
      selection.edgeToEdgeCrosshair(ctx, mousePos);
      onPaint();
      return;
    }

    const radius = Math.round(distance(origin, mousePos));
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
