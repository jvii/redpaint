import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { brushRecall } from '../brush/BrushRecall';
import { CustomBrush } from '../brush/CustomBrush';
import { createSizedBuiltInBrush } from '../brush/BuiltInBrushFactory';
import { dragSize } from './util/sizeDrag';

// DPaint's SizePen (docs/brush-transforms.md "Sizing a built-in brush",
// MODES.C). The same anchor/drag/preview interaction as StretchBrushTool, but
// the family shape is regenerated at each size (createSizedBuiltInBrush)
// instead of bitmap-resampling the small fixed art: DPaint's own split between
// SizePen and Stretch. No bounds box, unlike Stretch, whose cursor sits on the
// pointer uncleared; here the offset resize cursor reads as the mode and a
// built-in's shape is its own outline.
export class SizeBuiltInBrushTool implements Tool {
  public onInit(): void {
    overmind.actions.tool.sizeBuiltInBrushStart(null);
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const brush = brushRecall.current;
    if (!(brush instanceof CustomBrush) || brush.builtInFamily === undefined) {
      return;
    }
    const mousePos = getMousePos(event);
    // anchor the top-left so the drag extent starts out equal to the
    // brush's current (preset) size
    overmind.actions.tool.sizeBuiltInBrushStart({
      x: mousePos.x - brush.width,
      y: mousePos.y - brush.heigth,
    });
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const anchor = overmind.state.tool.sizeBuiltInBrushTool.anchor;
    const brush = brushRecall.current;
    if (!anchor || !(brush instanceof CustomBrush) || brush.builtInFamily === undefined) {
      return;
    }
    const size = dragSize(anchor, getMousePos(event));
    overmind.actions.tool.sizeBuiltInBrushStart(null);
    overmind.actions.tool.sizeBuiltInBrushSize(null);
    overmind.actions.brush.resizeBuiltInBrushTo(size);
    overmind.actions.toolbox.exitSizeBuiltInBrushMode();
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const brush = brushRecall.current;
    if (!(brush instanceof CustomBrush) || brush.builtInFamily === undefined) {
      return;
    }
    const mousePos = getMousePos(event);
    const anchor = overmind.state.tool.sizeBuiltInBrushTool.anchor;
    overlayCanvasController.clear();
    if (!anchor) {
      brush.drawPoints(
        [{ x: mousePos.x - brush.width / 2, y: mousePos.y - brush.heigth / 2 }],
        overlayCanvasController
      );
      return;
    }
    const size = dragSize(anchor, mousePos);
    const preview = createSizedBuiltInBrush(brush.builtInFamily, size.width, size.height);
    // The preview brush's own dimensions, not the dragged size: the generators
    // round, so this is the only figure that cannot disagree with the result.
    overmind.actions.tool.sizeBuiltInBrushSize({
      width: preview.width,
      height: preview.heigth,
    });
    preview.applyMode(overmind.state.brush.mode);
    preview.drawPoints(
      [{ x: anchor.x + size.width / 2, y: anchor.y + size.height / 2 }],
      overlayCanvasController
    );
  }

  public onMouseLeaveOverlay(): void {
    overlayCanvasController.clear();
  }

  public onExitOverlay(): void {
    overlayCanvasController.clear();
  }
}
