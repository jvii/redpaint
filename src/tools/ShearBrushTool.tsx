import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { brushHistory } from '../brush/BrushHistory';
import { CustomBrush } from '../brush/CustomBrush';
import { shearHorizontal } from '../algorithm/brushTransform';
import { Point } from '../types';

// DPaint's interactive Shear (docs/brush-transforms.md, SHEAR.C): a modal
// horizontal drag. The brush's top stays anchored; dragging the pointer
// left/right of the bottom-right corner slants the bottom that far. Same
// no-mutation contract as StretchBrushTool: every frame previews a temporary
// brush re-derived from the brush as it was on entry, release commits,
// cancel needs no restore.
export class ShearBrushTool implements Tool {
  public onInit(): void {
    overmind.actions.tool.brushShearStart(null);
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const brush = brushHistory.current;
    if (!(brush instanceof CustomBrush)) {
      return;
    }
    const mousePos = getMousePos(event);
    // same grip as Stretch: the pointer holds the bottom-right corner, so the
    // horizontal distance dragged past it is the shear amount
    overmind.actions.tool.brushShearStart({
      x: mousePos.x - brush.width,
      y: mousePos.y - brush.heigth,
    });
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const anchor = overmind.state.tool.brushShearTool.anchor;
    if (!anchor) {
      return;
    }
    const dx = shearAmount(anchor, getMousePos(event));
    overmind.actions.tool.brushShearStart(null);
    overmind.actions.brush.shearBrushBy(dx);
    overmind.actions.toolbox.toggleBrushTransformMode('brushShearTool');
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const brush = brushHistory.current;
    if (!(brush instanceof CustomBrush)) {
      return;
    }
    const mousePos = getMousePos(event);
    const anchor = overmind.state.tool.brushShearTool.anchor;
    overlayCanvasController.clear();
    if (!anchor) {
      brush.drawPoints(
        [{ x: mousePos.x - brush.width / 2, y: mousePos.y - brush.heigth / 2 }],
        overlayCanvasController
      );
      drawBoundsBox(
        { x: mousePos.x - brush.width, y: mousePos.y - brush.heigth },
        brush.width,
        brush.heigth
      );
      return;
    }
    const dx = shearAmount(anchor, mousePos);
    const preview = brush.transform((b) => shearHorizontal(b, dx));
    preview.applyMode(overmind.state.brush.mode);
    // the sheared bitmap widens by |dx|; shearing left grows it leftward
    // (the anchored top row sits at the bitmap's right edge), so the box's
    // left edge follows the drag while the top row stays visually put
    const topLeft = { x: anchor.x + Math.min(dx, 0), y: anchor.y };
    preview.drawPoints(
      [{ x: topLeft.x + preview.width / 2, y: topLeft.y + preview.heigth / 2 }],
      overlayCanvasController
    );
    drawBoundsBox(topLeft, preview.width, preview.heigth);
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onExitOverlay(): void {
    overlayCanvasController.clear();
  }
}

function drawBoundsBox(topLeft: Point, width: number, height: number): void {
  overlayCanvasController.selectionBox(topLeft, {
    x: topLeft.x + width - 1,
    y: topLeft.y + height - 1,
  });
}

// Horizontal distance dragged past the brush's bottom-right corner (the
// anchored top-left plus the entry width) — DPaint's dx = mx - bpl.x - w.
function shearAmount(anchor: Point, mousePos: Point): number {
  const brush = brushHistory.current;
  const width = brush instanceof CustomBrush ? brush.width : 0;
  return mousePos.x - anchor.x - width;
}
