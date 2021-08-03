import { Tool } from './Tool';
import { getMousePos, isRightMouseButton, omit } from './util/util';
import { distance } from '../algorithm/shape';
import { overmind } from '../index';
import { brushHistory } from '../brush/BrushHistory';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';

export class CircleTool implements Tool {
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
    overmind.actions.tool.circleToolOrigin(null);
    overmind.actions.tool.activeToolToFGFillStyle();
    overmind.actions.brush.toFGBrush();
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const origin = overmind.state.tool.circleTool.origin;
    if (!origin) {
      return;
    }

    const mousePos = getMousePos(event);
    const radius = Math.round(distance(origin, mousePos));

    if (this.filled) {
      brushHistory.current.drawFilledCircle(origin, radius, paintingCanvasController);
    } else {
      brushHistory.current.drawUnfilledCircle(origin, radius, paintingCanvasController);
    }
    overmind.actions.undo.setUndoPoint();
    this.onInit();
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    this.prepareToPaint(isRightMouseButton(event));
    const mousePos = getMousePos(event);
    overmind.actions.tool.circleToolOrigin(mousePos);
  }

  public onMouseEnter(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    if (!event.buttons) {
      this.onInit();
    }
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);

    const origin = overmind.state.tool.circleTool.origin;

    // If no origin has been set, we are still in origin selection mode.
    // In this case we only need to render the crosshair (and the brush for unfilled cirle).

    if (!origin) {
      if (!this.filled) {
        // DPaint only draws unfilled shapes with the current brush.
        // For filled circles we only render the croshair.
        brushHistory.current.drawPoint(mousePos, overlayCanvasController);
      }
      overlayCanvasController.selectionCrosshair(mousePos);
      return;
    }

    // Origin is set, so we render a preview of the cicle

    const radius = Math.round(distance(origin, mousePos));
    if (this.filled) {
      brushHistory.current.drawFilledCircle(origin, radius, overlayCanvasController);
    } else {
      brushHistory.current.drawUnfilledCircle(origin, radius, overlayCanvasController);
    }
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onMouseUpOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }
}
