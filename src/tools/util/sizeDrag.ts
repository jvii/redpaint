import { overmind } from '../../index';
import { formatPixelAspect } from '../../overmind/canvas/state';
import { Point } from '../../types';

// Drag extent from the anchor, always square: DPaint's SizePen took a single
// scalar from the drag (`siz = MAX(ABS(mx-bp.x), ABS(my-bp.y))`, MODES.C:
// pnDnMv), so its pens only ever came out as perfect circles and squares. The
// ABS(), rather than a directional delta clamped at a floor, is what gives the
// resize its "growing again the other way" feel: size is distance from the
// anchor, so dragging back through it grows again on the other side.
//
// The drag is measured on screen and converted back per axis, so the result
// comes out square there rather than in the raster (MODES.C's MAX(VMapX,
// VMapY), docs/pixel-aspect.md). Shared by the built-in brush and the
// airbrush, which DPaint sized through the same code.
export function dragSize(anchor: Point, mousePos: Point): { width: number; height: number } {
  const aspect = formatPixelAspect(overmind.state.canvas.screenFormatId);
  const side = Math.max(
    1,
    Math.abs(mousePos.x - anchor.x) * aspect.x,
    Math.abs(mousePos.y - anchor.y) * aspect.y
  );
  return { width: Math.max(1, side / aspect.x), height: Math.max(1, side / aspect.y) };
}
