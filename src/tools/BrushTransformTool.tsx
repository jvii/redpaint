import { Tool } from './Tool';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { brushRecall } from '../brush/BrushRecall';
import { CustomBrush } from '../brush/CustomBrush';
import { Point } from '../types';

// What the four interactive brush transforms (Stretch, Shear, Rotate, Bend;
// docs/brush-transforms.md) all do the same way, so each subclass is left
// holding only its own drag math and preview shape.
//
// The shared contract, in all four: a modal drag that never touches the real
// brush until release. Each preview frame re-derives from the brush as it was
// on entry, so there is no compounding resampling error, and cancelling (Esc,
// picking another tool) needs no restore. They also all operate on the current
// brush only when it's a real CustomBrush, clear the overlay on leave/exit, and
// swallow the context menu so a right-click can't open one mid-drag.
export abstract class BrushTransformTool implements Tool {
  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onExitOverlay(): void {
    overlayCanvasController.clear();
  }

  // The current brush, or null when it isn't one these tools can transform (the
  // primitive PixelBrush, before anything has been captured or picked). Every
  // handler starts here.
  protected currentBrush(): CustomBrush | null {
    const brush = brushRecall.current;
    return brush instanceof CustomBrush ? brush : null;
  }

  // The idle preview, before the drag starts: the brush rides centered on the
  // pointer (the same grip the drag will use, so pressing the button doesn't
  // jump the brush) inside a bounds box, so the armed mode stays visible even
  // where the brush bitmap is sparse or transparent. (No symmetry: a transform
  // targets the brush itself, not the canvas.)
  //
  // Bend overrides this: its grip is the middle of the edge that will bend, not
  // the brush's center.
  protected drawIdlePreview(mousePos: Point, brush: CustomBrush): void {
    brush.drawPoints(
      [{ x: mousePos.x - brush.width / 2, y: mousePos.y - brush.heigth / 2 }],
      overlayCanvasController
    );
    drawBoundsBox(
      { x: mousePos.x - brush.width, y: mousePos.y - brush.heigth },
      brush.width,
      brush.heigth
    );
  }

  // Stamps a preview brush with its top-left at the given point: the drag
  // frame's own placement, since drawPoints centers on the point it's given.
  protected drawPreviewAt(topLeft: Point, preview: CustomBrush): void {
    preview.drawPoints(
      [{ x: topLeft.x + preview.width / 2, y: topLeft.y + preview.heigth / 2 }],
      overlayCanvasController
    );
  }
}

// The transform's bounding box, in the same color-inverting style as the
// brush-capture marquee. It doubles as the "you are in a transform mode"
// indication. (Deviation for the better: DPaint 2 showed no box; Its only cue
// was the pointer changing to the text "SIZE".)
export function drawBoundsBox(topLeft: Point, width: number, height: number): void {
  overlayCanvasController.selectionBox(topLeft, {
    x: topLeft.x + width - 1,
    y: topLeft.y + height - 1,
  });
}
