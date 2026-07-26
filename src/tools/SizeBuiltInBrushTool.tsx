import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { brushRecall } from '../brush/BrushRecall';
import { CustomBrush } from '../brush/CustomBrush';
import { createSizedBuiltInBrush } from '../brush/BuiltInBrushFactory';
import { Point } from '../types';

// DPaint's SizePen (docs/brush-transforms.md "Sizing a built-in brush",
// MODES.C): right-click a built-in brush icon, then drag on canvas to
// resize it. Structurally the same anchor/drag/preview interaction as
// StretchBrushTool, but the built-in's family shape is regenerated at each
// size (createSizedBuiltInBrush) instead of bitmap-resampling the small
// fixed art — the same split DPaint had between SizePen (procedural pens)
// and Stretch (STRETCH.C, custom brushes only). No bounds-box overlay here,
// unlike Stretch: Canvas.tsx's offset resize cursor already reads as "you're
// in this mode" (StretchBrushTool.tsx needs the box precisely because its
// cursor sits on the pointer, uncleared), and a built-in's shape is its own
// outline, so a second rectangle around it is redundant.
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

// Drag extent from the anchor, always square — DPaint's SizePen took a
// single scalar from the drag (`siz = MAX(ABS(mx-bp.x), ABS(my-bp.y))`,
// MODES.C:pnDnMv), so its round/square pens only ever came out as perfect
// circles/squares, never ellipses/rectangles, regardless of drag direction.
// The ABS() (not a directional delta clamped at a floor) is what gives
// DPaint's resize its "growing again the other way" feel: size is the
// distance from the anchor, so dragging back through it doesn't bottom out —
// it passes through the minimum and grows again on the other side, mirrored.
// No Shift-to-keep-aspect needed here (unlike StretchBrushTool) since the
// aspect is always locked, not just optionally.
function dragSize(anchor: Point, mousePos: Point): { width: number; height: number } {
  const side = Math.max(1, Math.abs(mousePos.x - anchor.x), Math.abs(mousePos.y - anchor.y));
  return { width: side, height: side };
}
