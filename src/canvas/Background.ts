import { CanvasColorIndex } from '../domain/CanvasColorIndex';

// DPaint's Fix Background (docs/stencil.md): the picture frozen as a ground that
// CLR puts back instead of erasing, and the reference Lock FG measures "painted
// since" against. Outside Overmind for the reason the stencil is — a
// canvas-sized raster has no business behind a reactive proxy.
class Background {
  private raster: CanvasColorIndex | null = null;

  get fixed(): boolean {
    return this.raster !== null;
  }

  // The picture as it is, to put back later.
  get frozen(): CanvasColorIndex | null {
    return this.raster;
  }

  fix(canvas: CanvasColorIndex): void {
    this.raster = canvas;
  }

  free(): void {
    this.raster = null;
  }

  // Holds pixels at one size, so it means nothing against a canvas of another.
  dropIfSized(width: number, height: number): void {
    if (this.raster && (this.raster.width !== width || this.raster.height !== height)) {
      this.free();
    }
  }
}

export const background = new Background();
