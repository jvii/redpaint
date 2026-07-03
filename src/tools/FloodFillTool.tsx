import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { floodFill } from '../algorithm/floodfill';
import { symmetryTransforms } from '../algorithm/symmetry';
import { drawSymmetryIndicator } from './util/symmetryIndicator';
import { Point } from '../types';
import { CanvasColorIndex } from '../domain/CanvasColorIndex';

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

    const fillColorIndex = Number(overmind.state.palette.foregroundColorId);

    const pointsToFill = this.floodFillWithSymmetry(fillColorIndex, mousePos, canvasColorIndex);
    paintingCanvasController.points(pointsToFill, fillColorIndex);
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

    const fillColorIndex = Number(overmind.state.palette.backgroundColorId);

    // This is a hack to ensure the loading state is visible. Something to do with browser rendering timing.
    setTimeout(() => {
      const pointsToFill = this.floodFillWithSymmetry(fillColorIndex, mousePos, canvasColorIndex);
      paintingCanvasController.points(pointsToFill, fillColorIndex);
      overmind.actions.undo.setUndoPoint();
      overmind.actions.app.setLoading(false);
    }, 50);
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
  private floodFillWithSymmetry(
    fillColorIndex: number,
    seed: Point,
    canvasColorIndex: CanvasColorIndex
  ): Point[] {
    const settings = overmind.state.symmetry.activeSettings;
    const seeds = settings ? symmetryTransforms(settings).map((transform) => transform(seed)) : [seed];

    const { width, height } = overmind.state.canvas.resolution;
    const pointsToFill: Point[] = [];
    for (const s of seeds) {
      if (s.x < 0 || s.x >= width || s.y < 0 || s.y >= height) {
        continue; // seed rotated off-canvas
      }
      pointsToFill.push(...floodFill(fillColorIndex, s, canvasColorIndex));
    }
    return pointsToFill;
  }
}
