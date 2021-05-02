import {
  Tool,
  EventHandlerParamsWithEvent,
  OverlayEventHandlerParamsWithEvent,
  EventHandlerParams,
} from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton, omit } from './util/util';
import { Throttle } from './util/Throttle';
import { selection } from './util/SelectionIndicator';
import { overmind } from '../index';
import { brushHistory } from '../brush/BrushHistory';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';

export class RectangleTool implements Tool {
  private throttle = new Throttle(50);

  public constructor(filled: boolean) {
    this.filled = filled;
  }
  private filled: boolean;

  private prepareToPaint(withBGColor: boolean): void {
    if (withBGColor) {
      overmind.actions.tool.activeToolToBGFillStyle();
      overmind.actions.brush.toBGBrush();
    }
  }

  public onInit(params: EventHandlerParams): void {
    //selection.prepare(canvas);
    overmind.actions.tool.rectangleToolStart(null);
    overmind.actions.tool.activeToolToFGFillStyle();
    overmind.actions.brush.toFGBrush();
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { event, undoPoint } = params;

    const startPoint = overmind.state.tool.rectangleTool.start;
    if (!startPoint) {
      return;
    }

    const endPoint = getMousePos(event.currentTarget, event);

    if (this.filled) {
      brushHistory.current.drawFilledRect(startPoint, endPoint, paintingCanvasController);
    } else {
      brushHistory.current.drawUnfilledRect(startPoint, endPoint, paintingCanvasController);
    }
    undoPoint();
    this.onInit(omit(params, 'event'));
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    this.prepareToPaint(isRightMouseButton(event));
    const mousePos = getMousePos(event.currentTarget, event);
    overmind.actions.tool.rectangleToolStart(mousePos);
  }

  public onMouseEnter(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    if (!event.buttons) {
      this.onInit(omit(params, 'event'));
    }
  }

  // Overlay

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
    } = params;

    const mousePos = getMousePos(canvas, event);

    const startPoint = overmind.state.tool.rectangleTool.start;
    if (!startPoint) {
      clearOverlayCanvas(canvas);
      if (!this.filled) {
        // DPaint only draws unfilled shapes with the current brush
        brushHistory.current.drawPoint(mousePos, overlayCanvasController);
      }
      selection.edgeToEdgeCrosshair(ctx, mousePos);
      return;
    }

    if (this.filled) {
      clearOverlayCanvas(canvas);
      brushHistory.current.drawFilledRect(startPoint, mousePos, overlayCanvasController);
    } else {
      this.throttle.call((): void => {
        clearOverlayCanvas(canvas);
        brushHistory.current.drawUnfilledRect(startPoint, mousePos, overlayCanvasController);
      });
    }
  }

  public onMouseLeaveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    overlayCanvasController.clear();
  }

  public onMouseUpOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    overlayCanvasController.clear();
  }
}
