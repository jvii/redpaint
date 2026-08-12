import { BrushTransformTool } from './BrushTransformTool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { brushRecall } from '../brush/BrushRecall';
import { CustomBrush } from '../brush/CustomBrush';
import { shearHorizontal } from '../algorithm/brushTransform';
import { Point } from '../types';

// DPaint's interactive Shear (docs/brush-transforms.md, SHEAR.C), on the shared
// BrushTransformTool rails: the brush's top stays anchored, and dragging the
// pointer left or right of the bottom-right corner slants the bottom that far.
export class ShearBrushTool extends BrushTransformTool {
  public onInit(): void {
    overmind.actions.tool.brushShearStart(null);
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const brush = this.currentBrush();
    if (!brush) {
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
    const brush = this.currentBrush();
    if (!brush) {
      return;
    }
    const mousePos = getMousePos(event);
    const anchor = overmind.state.tool.brushShearTool.anchor;
    overlayCanvasController.clear();
    if (!anchor) {
      this.drawIdlePreview(mousePos, brush);
      return;
    }
    const dx = shearAmount(anchor, mousePos);
    const preview = brush.transform((b) => shearHorizontal(b, dx));
    preview.applyMode(overmind.state.brush.mode);
    // the sheared bitmap widens by |dx|; shearing left grows it leftward
    // (the anchored top row sits at the bitmap's right edge), so the box's
    // left edge follows the drag while the top row stays visually put
    const topLeft = { x: anchor.x + Math.min(dx, 0), y: anchor.y };
    this.drawPreviewAt(topLeft, preview);
    // the parallelogram the sheared brush actually fills (top row anchored,
    // bottom row slid by dx), not the wider axis-aligned box around it
    overlayCanvasController.selectionPolygon(shearedCorners(anchor, brush.width, brush.heigth, dx));
  }
}

// the brush's entry w x h rectangle with its bottom edge slid by dx. The top
// row is anchored (shear's pivot), the bottom row is where it lands
function shearedCorners(anchor: Point, width: number, height: number, dx: number): Point[] {
  return [
    { x: anchor.x, y: anchor.y },
    { x: anchor.x + width, y: anchor.y },
    { x: anchor.x + width + dx, y: anchor.y + height },
    { x: anchor.x + dx, y: anchor.y + height },
  ];
}

// Horizontal distance dragged past the brush's bottom-right corner (the
// anchored top-left plus the entry width): DPaint's dx = mx - bpl.x - w.
function shearAmount(anchor: Point, mousePos: Point): number {
  const brush = brushRecall.current;
  const width = brush instanceof CustomBrush ? brush.width : 0;
  return mousePos.x - anchor.x - width;
}
