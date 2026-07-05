import { Point } from '../../types';
import { overmind } from '../../index';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { symmetryTransforms } from '../../algorithm/symmetry';

// Draws an indicator point in the foreground color at each symmetry position of
// the given point, so the user can preview where symmetric copies will land for
// tools whose overlay preview does not otherwise show them (filled shapes, flood
// fill). No-op when symmetry is off. Mirrors DPaint's SymShowOb feedback, which
// showed the brush at every symmetry position.
//
// Pass includePrimary: false to skip the identity position — used by flood fill,
// where covering the targeted pixel would hide the color being filled (DPaint
// used a special fill pointer with a blank hotspot for the same reason).
export function drawSymmetryIndicator(point: Point, includePrimary = true): void {
  const settings = overmind.state.symmetry.activeSettings;
  if (!settings) {
    return;
  }
  const transforms = symmetryTransforms(settings);
  if (transforms.length <= 1) {
    return;
  }
  const points = (includePrimary ? transforms : transforms.slice(1)).map(
    (transform): Point => transform(point)
  );
  overlayCanvasController.points(points, overmind.state.palette.foregroundPaintColor);
}
