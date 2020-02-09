import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton, isLeftMouseButton } from './util';
import { overmind } from '../index';

export class CurveTool implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, undoPoint, onPaint } = params;

    const startPoint = overmind.state.tool.curveTool.start;
    if (!startPoint) {
      return;
    }

    const mousePos = getMousePos(canvas, event);
    const endPoint = overmind.state.tool.curveTool.end;

    if (endPoint) {
      overmind.state.brush.brush.drawCurve(
        canvas,
        startPoint,
        endPoint,
        mousePos,
        isRightMouseButton(event)
      );
      undoPoint();
      onPaint();
      overmind.actions.tool.curveToolReset();
    } else {
      overmind.actions.tool.curveToolEnd(mousePos);
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;

    if (!overmind.state.tool.curveTool.end) {
      const mousePos = getMousePos(canvas, event);
      overmind.actions.tool.curveToolStart(mousePos);
    }
  }

  // Overlay

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const { event, canvas, onPaint } = params;
    clearOverlayCanvas(canvas);

    const mousePos = getMousePos(canvas, event);

    const startPoint = overmind.state.tool.curveTool.start;
    if (!startPoint) {
      overmind.state.brush.brush.drawDot(canvas, mousePos, isRightMouseButton(event));
      onPaint();
      return;
    }

    const endPoint = overmind.state.tool.curveTool.end;
    if (endPoint) {
      overmind.state.brush.brush.drawCurve(
        canvas,
        startPoint,
        endPoint,
        mousePos,
        isRightMouseButton(event)
      );
    } else if (isLeftMouseButton(event)) {
      overmind.state.brush.brush.drawLine(canvas, startPoint, mousePos, isRightMouseButton(event));
    }
    onPaint();
  }

  public onMouseLeaveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const { canvas, onPaint } = params;
    clearOverlayCanvas(canvas);
    onPaint();
  }
}
