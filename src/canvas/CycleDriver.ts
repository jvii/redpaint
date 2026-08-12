import { overmind } from '..';
import { advanceCycleSteps, cycleOffsetsOf } from '../algorithm/cycle';
import { paintingCanvasController } from './paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from './overlayCanvas/OverlayCanvasController';
import { hoverBrushPreview } from './hoverBrushPreview';

// Drives color cycling (docs/color-cycling.md): one requestAnimationFrame loop
// advancing per-range fractional step accumulators, and (only when a range
// lands on a new whole step) dispatching the integer offsets to Overmind and
// re-uploading both GL palette textures. Display-only by construction: the
// document palette never changes; stopping just zeroes the offsets. Singleton,
// like the canvas controllers. Lifecycle is owned by palette.toggleCycling,
// which reads/flips state.palette.cyclingOn as its own on/off flag (no UI
// currently reads it back; the palette editor's On/Off control is per-range,
// driven by activeRange.active instead).
class CycleDriver {
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private accumulators: number[] = [];
  private paused = false;

  start(): void {
    if (this.rafId !== null) {
      return;
    }
    this.lastTime = null;
    this.accumulators = [];
    this.rafId = requestAnimationFrame(this.tick);
  }

  // Stops the loop and resets progress. The caller (toggleCycling) zeroes
  // state.palette.cycleOffsets and refreshes the GL palettes. Actions can't be
  // dispatched from inside another action via the overmind instance.
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTime = null;
    this.accumulators = [];
    this.paused = false;
  }

  // Renders the base (un-rotated) palette for the duration of fn, for save
  // paths that capture the drawing buffer and would otherwise bake a mid-cycle
  // frame into the file. Cycling resumes from where it paused, with the paused
  // time not counted as elapsed. Generic in the callback's result so the PNG
  // save can hold the base colors *around* the capture and still get its blob
  // back out.
  async withBaseColors<T>(fn: () => Promise<T> | T): Promise<T> {
    if (this.rafId === null) {
      return await fn();
    }
    this.paused = true;
    this.applyOffsets(overmind.state.palette.ranges.map(() => 0));
    try {
      return await fn();
    } finally {
      this.paused = false;
      this.lastTime = null;
    }
  }

  private tick = (now: number): void => {
    this.rafId = requestAnimationFrame(this.tick);
    if (this.paused) {
      return;
    }
    const elapsed = this.lastTime === null ? 0 : now - this.lastTime;
    this.lastTime = now;
    const ranges = overmind.state.palette.ranges;
    if (this.accumulators.length !== ranges.length) {
      this.accumulators = ranges.map(() => 0); // the range list changed under us
    }
    this.accumulators = advanceCycleSteps(this.accumulators, ranges, elapsed);
    const offsets = cycleOffsetsOf(this.accumulators, ranges);
    const current = overmind.state.palette.cycleOffsets;
    if (offsets.length !== current.length || offsets.some((o, i) => o !== current[i])) {
      this.applyOffsets(offsets);
    }
  };

  private applyOffsets(offsets: number[]): void {
    overmind.actions.palette.setCycleOffsets(offsets);
    refreshCyclePalettes();
  }
}

// Pushes state.palette.cycleOffsets to the screen: re-upload both GL palette
// textures, then replay the overlay. A free function rather than a CycleDriver
// method because toggleCycling needs it too, zeroing the offsets itself (an
// action cannot dispatch setCycleOffsets from inside another action).
export function refreshCyclePalettes(): void {
  paintingCanvasController.updatePalette();
  overlayCanvasController.updatePalette();
  // The overlay doesn't repaint on its own (it's immediate-mode, redrawn only
  // on mouse events). Replay whatever's currently shown (brush cursor,
  // in-progress shape) so it cycles too, like DPaint's did.
  overlayCanvasController.redrawForCycling();
  // ...and the DOM hover ghost re-renders its bitmap through the freshly
  // rotated display palette, so it animates while the mouse rests too.
  hoverBrushPreview.refresh();
}

export const cycleDriver = new CycleDriver();
