import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { dragSize } from './util/sizeDrag';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { createSizedBuiltInBrush } from '../brush/BuiltInBrushFactory';

// DPaint's SizeAirBrush (MODES.C), which shared every line of SizePen but the
// last: the same anchor/drag/preview interaction as SizeBuiltInBrushTool, and
// on release it sets the spray radius instead of replacing the brush.
//
// The preview is a solid round brush of the spray's own diameter — DPaint
// previewed with a ROUND_B pen, and the manual calls it "the solid circle,
// which represents the spray area". Not a spray: a cloud of random dots has no
// edge to size against.
export class SizeAirbrushTool implements Tool {
  public onInit(): void {
    overmind.actions.tool.sizeAirbrushStart(null);
    // The readout stands from the moment the mode is armed, at the spray's
    // current size. Safe in onInit, where the built-in brush's is not: there is
    // one airbrush gadget, so arming it again cannot re-target anything.
    const preview = sprayCircle(overmind.state.tool.airbrushTool.radius);
    overmind.actions.tool.sizeAirbrushSize({ width: preview.width, height: preview.heigth });
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    // anchor at the current radius, so the drag starts out changing nothing
    const radius = overmind.state.tool.airbrushTool.radius;
    overmind.actions.tool.sizeAirbrushStart({ x: mousePos.x - radius, y: mousePos.y - radius });
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const anchor = overmind.state.tool.sizeAirbrushTool.anchor;
    if (!anchor) {
      return;
    }
    overmind.actions.tool.sizeAirbrushStart(null);
    overmind.actions.tool.sizeAirbrushSize(null);
    overmind.actions.tool.airbrushRadius(sprayRadius(anchor, getMousePos(event)));
    overmind.actions.toolbox.exitSizeAirbrushMode();
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    const anchor = overmind.state.tool.sizeAirbrushTool.anchor;
    overlayCanvasController.clear();
    const radius = anchor ? sprayRadius(anchor, mousePos) : overmind.state.tool.airbrushTool.radius;
    // A built-in family's handle is its centre (CustomBrush.restingHandle), so
    // the stamp point is the circle's centre: on the pointer before a drag, and
    // one radius in from the anchor during one, which grows the circle away
    // from the anchor as the built-in resize does.
    const center = anchor ? { x: anchor.x + radius, y: anchor.y + radius } : mousePos;
    const preview = sprayCircle(radius);
    overmind.actions.tool.sizeAirbrushSize({ width: preview.width, height: preview.heigth });
    preview.applyMode(overmind.state.brush.mode);
    preview.drawPoints([center], overlayCanvasController);
  }

  public onMouseLeaveOverlay(): void {
    overlayCanvasController.clear();
  }

  public onExitOverlay(): void {
    overlayCanvasController.clear();
  }
}

// The drag reaches to the spray's edge, so its extent is the radius — DPaint's
// `SetAirBRad(VMapY(siz))` on the same scalar SizePen took for a pen's size.
function sprayRadius(anchor: { x: number; y: number }, mousePos: { x: number; y: number }): number {
  return dragSize(anchor, mousePos).width;
}

// The round built-in family at the spray's diameter, which is DPaint's ROUND_B
// pen: the same shape, so a sized spray previews as the same kind of circle a
// sized brush does.
function sprayCircle(radius: number): ReturnType<typeof createSizedBuiltInBrush> {
  const diameter = radius * 2;
  return createSizedBuiltInBrush('round', diameter, diameter);
}
