import { Point } from '../../types';
import { overmind } from '../../index';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { symmetryTransforms } from '../../algorithm/symmetry';

// An indicator point in the foreground color at each symmetry position of the
// given point, for tools whose overlay preview does not otherwise show where
// the copies land (filled shapes, flood fill). No-op when symmetry is off.
// DPaint's SymShowOb feedback.
//
// includePrimary: false skips the identity position, for flood fill, where
// covering the targeted pixel would hide the color being filled.
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
