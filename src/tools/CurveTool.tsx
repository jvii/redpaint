import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton, isLeftMouseButton } from './util';
import { overmind } from '../index';

export class CurveTool implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, undoPoint, onDrawToCanvas } = params;

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
        isRightMouseButton(event),
        overmind.state
      );
      undoPoint();
      onDrawToCanvas();
      overmind.actions.tool.curveToolReset();
      //toolStateDispatch({ type: 'curveToolStart', point: null });
      //toolStateDispatch({ type: 'curveToolEnd', point: null });
    } else {
      //toolStateDispatch({ type: 'curveToolEnd', point: mousePos });
      overmind.actions.tool.curveToolEnd(mousePos);
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;

    if (!overmind.state.tool.curveTool.end) {
      const mousePos = getMousePos(canvas, event);
      //toolStateDispatch({ type: 'curveToolStart', point: mousePos });
      overmind.actions.tool.curveToolStart(mousePos);
    }
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    const mousePos = getMousePos(canvas, event);

    const startPoint = overmind.state.tool.curveTool.start;
    if (!startPoint) {
      overmind.state.brush.brush.drawDot(
        canvas,
        mousePos,
        isRightMouseButton(event),
        overmind.state
      );
      onDrawToCanvas();
      return;
    }

    const endPoint = overmind.state.tool.curveTool.end;
    if (endPoint) {
      overmind.state.brush.brush.drawCurve(
        canvas,
        startPoint,
        endPoint,
        mousePos,
        isRightMouseButton(event),
        overmind.state
      );
    } else if (isLeftMouseButton(event)) {
      overmind.state.brush.brush.drawLine(
        canvas,
        startPoint,
        mousePos,
        isRightMouseButton(event),
        overmind.state
      );
    }
    onDrawToCanvas();
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}
