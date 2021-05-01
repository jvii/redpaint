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
  isLeftOrRightMouseButton,
  omit,
} from './util/util';
import { Throttle } from './util/Throttle';
import { overmind } from '../index';
import { brushHistory } from '../brush/BrushHistory';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';

export class CurveTool implements Tool {
  private throttle = new Throttle(50);

  private prepareToPaint(withBGColor: boolean): void {
    if (withBGColor) {
      overmind.actions.tool.activeToolToBGFillStyle();
      overmind.actions.brush.toBGBrush();
    }
  }

  public onInit(params: EventHandlerParams): void {
    overmind.actions.tool.curveToolReset();
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
      undoPoint,
      onPaint,
    } = params;

    const startPoint = overmind.state.tool.curveTool.start;
    if (!startPoint) {
      return;
    }

    const mousePos = getMousePos(canvas, event);
    const endPoint = overmind.state.tool.curveTool.end;

    if (endPoint) {
      brushHistory.current.drawCurve(startPoint, endPoint, mousePos, paintingCanvasController);
      undoPoint();
      onPaint();
      this.onInit(omit(params, 'event'));
    } else {
      overmind.actions.tool.curveToolEnd(mousePos);
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;

    if (!overmind.state.tool.curveTool.end) {
      this.prepareToPaint(isRightMouseButton(event));
      const mousePos = getMousePos(canvas, event);
      overmind.actions.tool.curveToolStart(mousePos);
    }
  }

  // Overlay

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
      onPaint,
    } = params;
    const mousePos = getMousePos(canvas, event);

    const startPoint = overmind.state.tool.curveTool.start;
    if (!startPoint) {
      clearOverlayCanvas(canvas);
      brushHistory.current.drawPoint(mousePos, overlayCanvasController);
      onPaint();
      return;
    }

    const endPoint = overmind.state.tool.curveTool.end;
    if (endPoint) {
      brushHistory.current.drawCurve(startPoint, endPoint, mousePos, overlayCanvasController);
    } else if (isLeftOrRightMouseButton(event)) {
      brushHistory.current.drawLine(startPoint, mousePos, overlayCanvasController);
    }
    onPaint();
  }

  public onMouseLeaveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const { onPaint } = params;
    overlayCanvasController.clear();
    onPaint();
  }
}
