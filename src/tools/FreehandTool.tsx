import {
  Tool,
  EventHandlerParamsWithEvent,
  OverlayEventHandlerParamsWithEvent,
  EventHandlerParams,
} from './Tool';
import {
  getMousePos,
  isRightMouseButton,
  isLeftOrRightMouseButton,
  omit,
  pointEquals,
  points8Connected,
} from './util/util';
import { overmind } from '../index';
import { brushHistory } from '../brush/BrushHistory';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';

export class FreehandTool implements Tool {
  private prepareToPaint(withBGColor: boolean): void {
    if (withBGColor) {
      overmind.actions.tool.activeToolToBGFillStyle();
      overmind.actions.brush.toBGBrush();
    }
  }

  public onInit(params: EventHandlerParams): void {
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
      ctx: { canvas },
    } = params;

    if (event.buttons && overmind.state.tool.freehandTool.previous) {
      const mousePos = getMousePos(canvas, event);
      const start = overmind.state.tool.freehandTool.previous;
      const end = mousePos;
      if (pointEquals(start, end)) {
        return; // this point has already been drawn to canvas
      }
      if (points8Connected(start, end)) {
        brushHistory.current.drawPoint(end, paintingCanvasController);
      } else {
        brushHistory.current.drawLine(start, end, paintingCanvasController);
      }
      overmind.actions.tool.freeHandToolPrevious(end);
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
    overmind.actions.tool.freeHandToolPrevious(mousePos);
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

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;
    if (event.buttons) {
      return;
    }
    //clearOverlayCanvas(canvas);
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
