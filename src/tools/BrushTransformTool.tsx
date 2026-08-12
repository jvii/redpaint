import { Tool } from './Tool';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { brushRecall } from '../brush/BrushRecall';
import { CustomBrush } from '../brush/CustomBrush';
import { Point } from '../types';

// What the four interactive brush transforms (Stretch, Shear, Rotate, Bend;
// docs/brush-transforms.md) all do the same way, leaving each subclass its own
// drag math and preview shape.
//
// The shared contract: a modal drag that never touches the real brush until
// release. Each preview frame re-derives from the brush as it was on entry, so
// there is no compounding resampling error and cancelling needs no restore.
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

  // The idle preview, before the drag starts: the brush centered on the pointer
  // (the grip the drag will use, so pressing the button doesn't jump it) inside
  // a bounds box, which keeps the armed mode visible even where the bitmap is
  // sparse. Bend overrides it for its own grip.
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
