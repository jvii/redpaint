import { CanvasColorIndex } from '../domain/CanvasColorIndex';
import {
  LockedColors,
  reversedStencil,
  stencilFromColors,
  stencilFromPainted,
} from '../algorithm/stencilMask';

// The one stencil, held outside Overmind for the reason BrushSlots is: a
// canvas-sized raster has no business behind a reactive proxy. What the UI
// needs is mirrored into overmind/stencil. docs/stencil.md.
class Stencil {
  private raster: CanvasColorIndex | null = null;
  private lockedColors: LockedColors = [];
  private on = false;

  // Non-null only while a stencil exists and is not suspended, which is exactly
  // when anything should consult it.
  get active(): CanvasColorIndex | null {
    return this.on ? this.raster : null;
  }

  get exists(): boolean {
    return this.raster !== null;
  }

  get enabled(): boolean {
    return this.on && this.raster !== null;
  }

  get colors(): LockedColors {
    return this.lockedColors;
  }

  make(canvas: CanvasColorIndex, locked: LockedColors): void {
    this.lockedColors = [...locked];
    this.raster = stencilFromColors(canvas, this.lockedColors);
    this.on = true;
  }

  // Retakes the mask from the picture as it is now, with the same colors: what
  // makes pixels painted since Make protected too.
  remake(canvas: CanvasColorIndex): void {
    if (!this.raster) {
      return;
    }
    this.raster = stencilFromColors(canvas, this.lockedColors);
    this.on = true;
  }

  lockPainted(canvas: CanvasColorIndex, backgroundColorNumber: number): void {
    this.lockedColors = [];
    this.raster = stencilFromPainted(canvas, backgroundColorNumber);
    this.on = true;
  }

  reverse(canvas: CanvasColorIndex): void {
    if (!this.raster) {
      return;
    }
    this.raster = reversedStencil(this.raster, canvas);
    this.lockedColors = this.lockedColors.map((locked) => !locked);
  }

  setEnabled(enabled: boolean): void {
    this.on = enabled;
  }

  free(): void {
    this.raster = null;
    this.lockedColors = [];
    this.on = false;
  }

  // A stencil holds coordinates into the picture it was made against, so it
  // means nothing once the canvas is a different size or a different picture.
  dropIfSized(width: number, height: number): void {
    if (this.raster && (this.raster.width !== width || this.raster.height !== height)) {
      this.free();
    }
  }
}

export const stencil = new Stencil();
