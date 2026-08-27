import { Tool } from './Tool';
import { getMousePos, isRightMouseButton } from './util/util';
import { formatPixelAspect } from '../overmind/canvas/state';
import { Point } from '../types';
import { overmind } from '../index';
import { symmetryBrush } from '../brush/SymmetryBrush';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { drawSymmetryIndicator } from './util/symmetryIndicator';

// The raster radii a drag asks for, corrected so the result reads round on
// screen rather than in the raster (docs/pixel-aspect.md). The drag itself is
// measured in the same corrected space, so the circle meets the cursor.
//
// Equal radii mean a true circle, which keeps Lo-Res, Hi-Res and Native on the
// circle rasterizer rather than sending them through the ellipse one.
function circleRadii(origin: Point, to: Point): { rx: number; ry: number } {
  const aspect = formatPixelAspect(overmind.state.canvas.screenFormatId);
  const dx = (to.x - origin.x) * aspect.x;
  const dy = (to.y - origin.y) * aspect.y;
  const radius = Math.sqrt(dx * dx + dy * dy);
  return { rx: Math.round(radius / aspect.x), ry: Math.round(radius / aspect.y) };
}

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

    const { rx, ry } = circleRadii(origin, getMousePos(event));
    if (this.filled) {
      rx === ry
        ? symmetryBrush.drawFilledCircle(origin, rx, paintingCanvasController)
        : symmetryBrush.drawFilledEllipse(origin, rx, ry, 0, paintingCanvasController);
    } else {
      rx === ry
        ? symmetryBrush.drawUnfilledCircle(origin, rx, paintingCanvasController)
        : symmetryBrush.drawUnfilledEllipse(origin, rx, ry, 0, paintingCanvasController);
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
        symmetryBrush.drawPoints([mousePos], overlayCanvasController);
      } else {
        // For filled shapes the brush is not drawn, so show a foreground-color
        // point at each symmetry position instead.
        drawSymmetryIndicator(mousePos);
      }
      overlayCanvasController.selectionCrosshair(mousePos);
      return;
    }

    // Origin is set, so we render a preview of the cicle

    const { rx, ry } = circleRadii(origin, mousePos);
    if (this.filled) {
      rx === ry
        ? symmetryBrush.drawFilledCircle(origin, rx, overlayCanvasController)
        : symmetryBrush.drawFilledEllipse(origin, rx, ry, 0, overlayCanvasController);
    } else {
      rx === ry
        ? symmetryBrush.drawUnfilledCircle(origin, rx, overlayCanvasController)
        : symmetryBrush.drawUnfilledEllipse(origin, rx, ry, 0, overlayCanvasController);
      symmetryBrush.drawPointerCopies(mousePos, overlayCanvasController);
    }
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onMouseUpOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }
}
