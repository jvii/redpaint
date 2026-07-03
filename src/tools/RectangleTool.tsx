import { Tool } from './Tool';
import { getMousePos, isRightMouseButton } from './util/util';
import { overmind } from '../index';
import { symmetryBrush } from '../brush/SymmetryBrush';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { drawSymmetryIndicator } from './util/symmetryIndicator';

export class RectangleTool implements Tool {
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

  public onInit(): void {
    //selection.prepare(canvas);
    overmind.actions.tool.rectangleToolStart(null);
    overmind.actions.tool.activeToolToFGFillStyle();
    overmind.actions.brush.toFGBrush();
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const startPoint = overmind.state.tool.rectangleTool.start;
    if (!startPoint) {
      return;
    }

    const endPoint = getMousePos(event);

    if (this.filled) {
      symmetryBrush.drawFilledRect(startPoint, endPoint, paintingCanvasController);
    } else {
      symmetryBrush.drawUnfilledRect(startPoint, endPoint, paintingCanvasController);
    }
    overmind.actions.undo.setUndoPoint();
    this.onInit();
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    this.prepareToPaint(isRightMouseButton(event));
    const mousePos = getMousePos(event);
    overmind.actions.tool.rectangleToolStart(mousePos);
  }

  public onMouseEnter(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    if (!event.buttons) {
      this.onInit();
    }
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);

    const startPoint = overmind.state.tool.rectangleTool.start;
    if (!startPoint) {
      if (!this.filled) {
        // DPaint only draws unfilled shapes with the current brush
        symmetryBrush.drawPoints([mousePos], overlayCanvasController);
      } else {
        // For filled shapes the brush is not drawn, so show a foreground-color
        // point at each symmetry position instead.
        drawSymmetryIndicator(mousePos);
      }
      overlayCanvasController.selectionCrosshair(mousePos);
      return;
    }

    if (this.filled) {
      symmetryBrush.drawFilledRect(startPoint, mousePos, overlayCanvasController);
    } else {
      symmetryBrush.drawUnfilledRect(startPoint, mousePos, overlayCanvasController);
    }
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onMouseUpOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }
}
