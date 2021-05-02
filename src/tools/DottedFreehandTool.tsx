import {
  Tool,
  EventHandlerParamsWithEvent,
  OverlayEventHandlerParamsWithEvent,
  EventHandlerParams,
} from './Tool';
import { getMousePos, isRightMouseButton, omit, isLeftOrRightMouseButton } from './util/util';
import { overmind } from '../index';
import { brushHistory } from '../brush/BrushHistory';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';

export class DottedFreehandTool implements Tool {
  private prepareToPaint(withBGColor: boolean): void {
    if (withBGColor) {
      overmind.actions.tool.activeToolToBGFillStyle();
      overmind.actions.brush.toBGBrush();
    }
  }

  public onInit(params: EventHandlerParams): void {
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

    if (event.buttons) {
      const mousePos = getMousePos(canvas, event);
      brushHistory.current.drawPoint(mousePos, paintingCanvasController);
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;

    const mousePos = getMousePos(canvas, event);
    this.prepareToPaint(isRightMouseButton(event));
    brushHistory.current.drawPoint(mousePos, paintingCanvasController);
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { undoPoint } = params;
    this.onInit(omit(params, 'event'));
    undoPoint();
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    this.onInit(omit(params, 'event'));
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
      ctx: { canvas },
    } = params;
    if (event.buttons) {
      return;
    }
    const mousePos = getMousePos(canvas, event);
    brushHistory.current.drawPoint(mousePos, overlayCanvasController);
  }

  public onMouseDownOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    overlayCanvasController.clear();
  }

  public onMouseLeaveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    overlayCanvasController.clear();
  }
}
