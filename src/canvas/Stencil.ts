import { CanvasColorIndex } from '../domain/CanvasColorIndex';
import {
  LockedColors,
  reversedStencil,
  refreshedStencil,
  stencilFromChanges,
  stencilFromColors,
} from '../algorithm/stencilMask';

// What the mask was made from. Not derivable from the locked colors, which
// Reverse fills in for a Lock FG stencil as readily as for any other.
export type StencilKind = 'colors' | 'painted';

// The one stencil, held outside Overmind for the reason BrushSlots is: a
// canvas-sized raster has no business behind a reactive proxy. What the UI
// needs is mirrored into overmind/stencil. docs/stencil.md.
class Stencil {
  private raster: CanvasColorIndex | null = null;
  private lockedColors: LockedColors = [];
  private origin: StencilKind = 'colors';
  private on = false;
  private saved: {
    raster: CanvasColorIndex | null;
    lockedColors: LockedColors;
    on: boolean;
    origin: StencilKind;
  } | null = null;

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

  get kind(): StencilKind {
    return this.origin;
  }

  make(canvas: CanvasColorIndex, locked: LockedColors): void {
    this.lockedColors = [...locked];
    this.origin = 'colors';
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

  // No color selection behind this one: the mask is an area, so Remake, which
  // re-derives from colors, has nothing to work from.
  lockPainted(canvas: CanvasColorIndex, background: CanvasColorIndex): void {
    this.lockedColors = [];
    this.origin = 'painted';
    this.raster = stencilFromChanges(canvas, background);
    this.on = true;
  }

  // The mask itself flips; the color set comes in already inverted, since only
  // the caller knows how many colors the palette has.
  reverse(canvas: CanvasColorIndex, locked: LockedColors): void {
    if (!this.raster) {
      return;
    }
    this.raster = reversedStencil(this.raster, canvas);
    this.lockedColors = [...locked];
  }

  // Turning it back on retakes the protected pixels from the picture as it is
  // now, keeping the mask: anything painted while it was off stays painted.
  setEnabled(enabled: boolean, canvas: CanvasColorIndex | null): void {
    if (enabled && this.raster && canvas) {
      this.raster = refreshedStencil(this.raster, canvas);
    }
    this.on = enabled;
  }

  free(): void {
    this.raster = null;
    this.lockedColors = [];
    this.on = false;
  }

  // The requester remakes the stencil on every tick, so the picture shows what
  // the colors catch as they are chosen. What was there before is kept whole
  // for Cancel: the rasters are never written in place, so holding the old one
  // costs a reference rather than a copy.
  saveForCancel(): void {
    this.saved = {
      raster: this.raster,
      lockedColors: this.lockedColors,
      on: this.on,
      origin: this.origin,
    };
  }

  restoreSaved(): void {
    if (!this.saved) {
      return;
    }
    this.raster = this.saved.raster;
    this.lockedColors = this.saved.lockedColors;
    this.on = this.saved.on;
    this.origin = this.saved.origin;
    this.saved = null;
  }

  dropSaved(): void {
    this.saved = null;
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
