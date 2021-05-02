import { Tool } from './Tool';
import { getMousePos, isRightMouseButton, isLeftOrRightMouseButton } from './util/util';
import { overmind } from '../index';
import { brushHistory } from '../brush/BrushHistory';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';

export class CurveTool implements Tool {
  private prepareToPaint(withBGColor: boolean): void {
    if (withBGColor) {
      overmind.actions.tool.activeToolToBGFillStyle();
      overmind.actions.brush.toBGBrush();
    }
  }

  public onInit(): void {
    overmind.actions.tool.curveToolReset();
    overmind.actions.tool.activeToolToFGFillStyle();
    overmind.actions.brush.toFGBrush();
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const startPoint = overmind.state.tool.curveTool.start;
    if (!startPoint) {
      return;
    }

    const mousePos = getMousePos(event);
    const endPoint = overmind.state.tool.curveTool.end;

    if (endPoint) {
      brushHistory.current.drawCurve(startPoint, endPoint, mousePos, paintingCanvasController);
      overmind.actions.undo.setUndoPoint();
      this.onInit();
    } else {
      overmind.actions.tool.curveToolEnd(mousePos);
    }
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    if (!overmind.state.tool.curveTool.end) {
      this.prepareToPaint(isRightMouseButton(event));
      const mousePos = getMousePos(event);
      overmind.actions.tool.curveToolStart(mousePos);
    }
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);

    const startPoint = overmind.state.tool.curveTool.start;
    if (!startPoint) {
      brushHistory.current.drawPoint(mousePos, overlayCanvasController);
      return;
    }

    const endPoint = overmind.state.tool.curveTool.end;
    if (endPoint) {
      brushHistory.current.drawCurve(startPoint, endPoint, mousePos, overlayCanvasController);
    } else if (isLeftOrRightMouseButton(event)) {
      brushHistory.current.drawLine(startPoint, mousePos, overlayCanvasController);
    }
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }
}
