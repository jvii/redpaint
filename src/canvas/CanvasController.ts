import { CustomBrush } from '../brush/CustomBrush';
import { LineH } from '../domain/LineH';
import { LineV } from '../domain/LineV';
import { PaintColor, Point } from '../types';
import { GradientFillStyle, GradientShape } from '../algorithm/gradientFill';

// A sink for draw commands. This is all a brush needs to draw into — the
// painting and overlay canvas controllers implement it, and so does the
// DrawCallBuffer used by SymmetryBrush to batch draw calls.
export interface DrawTarget {
  points(points: Point[], color: PaintColor): void;
  lines(lines: (LineH | LineV)[], color: PaintColor): void;
  quad(start: Point, end: Point, color: PaintColor): void;
  // GPU gradient fill for convex shapes (rect/circle/ellipse): one draw
  // call per shape, band+dither decided per fragment. Solid fills and
  // degenerate ranges never come through here — the brushes fall back to
  // quad()/lines() (see fillStyleDraw.ts). seed: the per-stroke dither
  // seed, identical across a stroke's symmetry copies.
  gradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void;
  drawImage(points: Point[], brush: CustomBrush): void;
  // Effect-mode stamping (Smear/Shade/Blend/Smooth/Cycle): order-dependent
  // per-point stamps handled by EffectIndexer. copyId identifies the symmetry
  // copy so each kaleidoscope copy keeps its own effect chain; plain callers
  // pass 0 and DrawCallBuffer assigns real ids on replay. endEffectStroke
  // resets the chains (previous-stamp state) at stroke end.
  //
  // Unlike every other DrawTarget method, effectDraw does NOT render on its
  // own — it only writes into the color-index texture. Under N-way symmetry
  // each copy needs its own effectDraw call (DrawCallBuffer can't merge them:
  // each copy's stepped color, e.g. Cycle's per-copy counter, genuinely
  // differs), so rendering per call would mean N full-canvas re-renders per
  // stroke segment instead of 1. Callers must call flushEffectDraw() once
  // after they're done issuing effectDraw calls for a segment (a single
  // direct call, or a whole batch of symmetry copies) to trigger the one
  // render they share.
  effectDraw(points: Point[], brush: CustomBrush, copyId: number): void;
  flushEffectDraw(): void;
  endEffectStroke(): void;
}

// A canvas controller is a DrawTarget that also owns and manages real canvas
// surfaces.
export interface CanvasController extends DrawTarget {
  attachMainCanvas(mainCanvas: HTMLCanvasElement): void;
  attachZoomCanvas(zoomCanvas: HTMLCanvasElement): void;
  clear(): void;
}
