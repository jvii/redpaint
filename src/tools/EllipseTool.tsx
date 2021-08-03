import { Tool } from './Tool';
import { getMousePos, isLeftMouseButton, isRightMouseButton } from './util/util';
import { overmind } from '../index';
import { brushHistory } from '../brush/BrushHistory';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';

export class EllipseTool implements Tool {
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
    overmind.actions.tool.ellipseToolReset();
    overmind.actions.tool.activeToolToFGFillStyle();
    overmind.actions.brush.toFGBrush();
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseMove(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    // Do nothing if center point not set, or radius not yet set

    const origin = overmind.state.tool.ellipseTool.origin;
    if (!origin) {
      return;
    }
    if (!overmind.state.tool.ellipseTool.radiusX || !overmind.state.tool.ellipseTool.radiusY) {
      return;
    }

    // Change rotation angle if left mouse button down, otherwise re-adjust radius

    const mousePos = getMousePos(event);

    if (isLeftMouseButton(event)) {
      const rotationAngle = mousePos.y - origin.y - overmind.state.tool.ellipseTool.radiusY;
      overmind.actions.tool.ellipseToolAngle(rotationAngle);
    } else {
      const radiusX = Math.abs(mousePos.x - origin.x);
      const radiusY = Math.abs(mousePos.y - origin.y);
      overmind.actions.tool.ellipseToolRadius({ x: radiusX, y: radiusY });
    }
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const origin = overmind.state.tool.ellipseTool.origin;
    if (!origin) {
      return;
    }

    // If radius has not been set, set it and return

    const radiusX = overmind.state.tool.ellipseTool.radiusX;
    const radiusY = overmind.state.tool.ellipseTool.radiusY;
    if (!radiusX || !radiusY) {
      const mousePos = getMousePos(event);
      overmind.actions.tool.ellipseToolRadius({
        x: Math.abs(mousePos.x - origin.x),
        y: Math.abs(mousePos.y - origin.y),
      });
      return;
    }

    // Draw ellipse

    const angle = overmind.state.tool.ellipseTool.angle;
    if (this.filled) {
      brushHistory.current.drawFilledEllipse(
        origin,
        radiusX,
        radiusY,
        angle,
        paintingCanvasController
      );
    } else {
      brushHistory.current.drawUnfilledEllipse(
        origin,
        radiusX,
        radiusY,
        angle,
        paintingCanvasController
      );
    }
    overmind.actions.undo.setUndoPoint();
    this.onInit();
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    if (!overmind.state.tool.ellipseTool.origin) {
      overmind.actions.tool.ellipseToolOrigin(mousePos);
      this.prepareToPaint(isRightMouseButton(event));
    }
  }

  public onMouseEnter(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    if (!event.buttons) {
      this.onInit();
    }
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);

    const origin = overmind.state.tool.ellipseTool.origin;
    if (!origin) {
      overlayCanvasController.clear();
      if (!this.filled) {
        // DPaint only draws unfilled shapes with the current brush
        brushHistory.current.drawPoint(mousePos, overlayCanvasController);
      }
      overlayCanvasController.selectionCrosshair(mousePos);
      return;
    }

    const radiusX = overmind.state.tool.ellipseTool.radiusX;
    const radiusY = overmind.state.tool.ellipseTool.radiusY;
    const newRadiusX = Math.abs(mousePos.x - origin.x);
    const newRadiusY = Math.abs(mousePos.y - origin.y);
    const angle = overmind.state.tool.ellipseTool.angle;

    if (this.filled) {
      overlayCanvasController.clear();
      brushHistory.current.drawFilledEllipse(
        origin,
        radiusX ? radiusX : newRadiusX,
        radiusY ? radiusY : newRadiusY,
        angle,
        overlayCanvasController
      );
    } else {
      overlayCanvasController.clear();
      brushHistory.current.drawUnfilledEllipse(
        origin,
        radiusX ? radiusX : newRadiusX,
        radiusY ? radiusY : newRadiusY,
        angle,
        overlayCanvasController
      );
    }
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }
}
