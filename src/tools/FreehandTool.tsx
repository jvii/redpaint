import { Tool } from './Tool';
import {
  getMousePos,
  isRightMouseButton,
  isLeftOrRightMouseButton,
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

  public onInit(): void {
    overmind.actions.tool.freeHandToolPrevious(null);
    overmind.actions.tool.activeToolToFGFillStyle();
    overmind.actions.brush.toFGBrush();
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseMove(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    if (event.buttons && overmind.state.tool.freehandTool.previous) {
      const mousePos = getMousePos(event.currentTarget, event);
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

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event.currentTarget, event);
    this.prepareToPaint(isRightMouseButton(event));
    brushHistory.current.drawPoint(mousePos, paintingCanvasController);
    overmind.actions.tool.freeHandToolPrevious(mousePos);
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    this.onInit();
    //undoPoint();
  }

  public onMouseLeave(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    this.onInit();
  }

  public onMouseEnter(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    if (isLeftOrRightMouseButton(event)) {
      this.prepareToPaint(isRightMouseButton(event));
      const mousePos = getMousePos(event.currentTarget, event);
      overmind.actions.tool.freeHandToolPrevious(mousePos);
    }
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    if (event.buttons) {
      return;
    }
    //clearOverlayCanvas(canvas);
    const mousePos = getMousePos(event.currentTarget, event);
    brushHistory.current.drawPoint(mousePos, overlayCanvasController);
  }

  public onMouseDownOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }
}
