import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { floodFill } from '../algorithm/floodfill';
import { symmetryTransforms } from '../algorithm/symmetry';
import { drawSymmetryIndicator } from './util/symmetryIndicator';
import { PaintColor, Point } from '../types';
import { CanvasColorIndex } from '../domain/CanvasColorIndex';
import { bucketPointsByGradient } from '../algorithm/gradientFill';

export class FloodFillTool implements Tool {
  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overmind.actions.app.setLoading(true);
  }

  public onClick(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    const canvasColorIndex = paintingCanvasController.getCanvasColorIndex();
    if (!canvasColorIndex) {
      overmind.actions.app.setLoading(false);
      return;
    }

    const fillColor = overmind.state.palette.foregroundPaintColor;

    const pointGroups = this.floodFillWithSymmetry(fillColor, mousePos, canvasColorIndex);
    this.paintPoints(pointGroups, fillColor);
    overmind.actions.undo.setUndoPoint();
    overmind.actions.app.setLoading(false);
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
    const mousePos = getMousePos(event);
    const canvasColorIndex = paintingCanvasController.getCanvasColorIndex();
    if (!canvasColorIndex) {
      overmind.actions.app.setLoading(false);
      return;
    }

    const fillColor = overmind.state.palette.backgroundPaintColor;

    // This is a hack to ensure the loading state is visible. Something to do with browser rendering timing.
    setTimeout(() => {
      const pointGroups = this.floodFillWithSymmetry(fillColor, mousePos, canvasColorIndex);
      this.paintPoints(pointGroups, fillColor);
      overmind.actions.undo.setUndoPoint();
      overmind.actions.app.setLoading(false);
    }, 50);
  }

  // Solid mode (the default) merges every seed's points into a single call
  // with solidColor, as before (the color is uniform, so merging first costs
  // nothing). Gradient mode ignores solidColor (a gradient isn't a single
  // color to swap for FG/BG — left- and right-click apply the same gradient)
  // and buckets each seed's points *independently*, so every symmetry copy
  // gets its own gradient normalized to its own extent, rather than one
  // gradient stretched across the combined bounding box of every copy.
  private paintPoints(pointGroups: Point[][], solidColor: PaintColor): void {
    const style = overmind.state.fillStyle.effectiveFillStyle;
    if (!style) {
      paintingCanvasController.points(pointGroups.flat(), solidColor);
      return;
    }
    for (const group of pointGroups) {
      for (const [colorNumber, bucketPoints] of bucketPointsByGradient(group, style)) {
        paintingCanvasController.points(bucketPoints, { kind: 'index', colorNumber });
      }
    }
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    if (event.buttons) {
      return;
    }
    // Show where the symmetric fills will be seeded. The primary point is
    // skipped so the indicator never covers the pixel color being targeted
    // (DPaint's fill pointer left the hotspot blank for the same reason).
    drawSymmetryIndicator(getMousePos(event), false);
  }

  public onMouseDownOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  // Under symmetry a flood fill cannot be a rotated copy of the fill region, because
  // the underlying image is not symmetric. Instead we run an independent real flood
  // fill from each symmetry-transformed seed point. The fills run sequentially on the
  // same (mutating) color index, so overlapping regions are handled like DPaint.
  // Returns one group per seed (rather than one merged array) so a gradient
  // fill can bucket each seed's region against its own extent independently
  // — see paintPoints.
  private floodFillWithSymmetry(
    fillColor: PaintColor,
    seed: Point,
    canvasColorIndex: CanvasColorIndex
  ): Point[][] {
    const settings = overmind.state.symmetry.activeSettings;
    const seeds = settings ? symmetryTransforms(settings).map((transform) => transform(seed)) : [seed];

    const { width, height } = overmind.state.canvas.resolution;
    const pointGroups: Point[][] = [];
    for (const s of seeds) {
      if (s.x < 0 || s.x >= width || s.y < 0 || s.y >= height) {
        continue; // seed rotated off-canvas
      }
      const filled = floodFill(fillColor, s, canvasColorIndex);
      if (filled.length > 0) {
        pointGroups.push(filled);
      }
    }
    return pointGroups;
  }
}
