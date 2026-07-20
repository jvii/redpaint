import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { brushRecall } from '../brush/BrushRecall';
import { CustomBrush } from '../brush/CustomBrush';
import { resize } from '../algorithm/brushTransform';
import { Point } from '../types';

// DPaint's interactive Stretch (docs/brush-transforms.md, STRETCH.C): a
// modal drag that resizes the current custom brush. Press anchors the
// brush's top-left so its size at that moment equals the drag extent; drag
// reshapes a live preview; release commits. Nothing touches the real brush
// until release — each preview frame re-derives from the brush as it was on
// entry, so there is no compounding resampling error and cancelling (Esc,
// picking another tool) needs no restore.
export class StretchBrushTool implements Tool {
  public onInit(): void {
    overmind.actions.tool.brushStretchStart(null);
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const brush = brushRecall.current;
    if (!(brush instanceof CustomBrush)) {
      return;
    }
    const mousePos = getMousePos(event);
    // anchor the top-left so the drag extent starts out equal to the brush's
    // current size: dragging down-right grows it, up-left shrinks it
    overmind.actions.tool.brushStretchStart({
      x: mousePos.x - brush.width,
      y: mousePos.y - brush.heigth,
    });
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const anchor = overmind.state.tool.brushStretchTool.anchor;
    if (!anchor) {
      return;
    }
    const size = dragSize(anchor, getMousePos(event), event.shiftKey);
    overmind.actions.tool.brushStretchStart(null);
    overmind.actions.brush.stretchBrushTo(size);
    // done: back to the selected drawing tool with the stretched brush
    overmind.actions.toolbox.toggleBrushTransformMode('brushStretchTool');
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const brush = brushRecall.current;
    if (!(brush instanceof CustomBrush)) {
      return;
    }
    const mousePos = getMousePos(event);
    const anchor = overmind.state.tool.brushStretchTool.anchor;
    overlayCanvasController.clear();
    if (!anchor) {
      // not dragging yet: the brush rides with its bottom-right corner at the
      // pointer — the same grip the drag will use, so pressing the button
      // doesn't jump the brush. Boxed so the armed mode is visible even where
      // the brush bitmap is sparse or transparent. (No symmetry: the stretch
      // targets the brush itself, not the canvas.)
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
    const size = dragSize(anchor, mousePos, event.shiftKey);
    const preview = brush.transform((b) => resize(b, size.width, size.height));
    preview.applyMode(overmind.state.brush.mode);
    preview.drawPoints(
      [{ x: anchor.x + size.width / 2, y: anchor.y + size.height / 2 }],
      overlayCanvasController
    );
    drawBoundsBox(anchor, size.width, size.height);
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onExitOverlay(): void {
    overlayCanvasController.clear();
  }
}

// The transform's bounding box, in the same color-inverting style as the
// brush-capture marquee. It doubles as the "you are in stretch mode"
// indication. (Deviation for the better: DPaint 2 showed no box — its only
// cue was the pointer changing to the text "SIZE".)
function drawBoundsBox(topLeft: Point, width: number, height: number): void {
  overlayCanvasController.selectionBox(topLeft, {
    x: topLeft.x + width - 1,
    y: topLeft.y + height - 1,
  });
}

// Drag extent from the anchored top-left, at least 1x1. With Shift the
// original aspect ratio is kept (DPaint's constrained stretch): the dragged
// corner is the pointer's projection onto the brush's aspect diagonal, so it
// stays as close to the pointer as the constraint allows instead of
// overshooting on one axis.
function dragSize(
  anchor: Point,
  mousePos: Point,
  keepAspect: boolean
): { width: number; height: number } {
  let width = Math.max(1, mousePos.x - anchor.x);
  let height = Math.max(1, mousePos.y - anchor.y);
  const brush = brushRecall.current;
  if (keepAspect && brush instanceof CustomBrush) {
    const dx = mousePos.x - anchor.x;
    const dy = mousePos.y - anchor.y;
    const w = brush.width;
    const h = brush.heigth;
    const scale = (dx * w + dy * h) / (w * w + h * h);
    width = Math.max(1, Math.round(w * scale));
    height = Math.max(1, Math.round(h * scale));
  }
  return { width, height };
}
