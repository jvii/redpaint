import { CustomBrush } from '../brush/CustomBrush';
import { LineH } from '../domain/LineH';
import { LineV } from '../domain/LineV';
import { PaintColor, Point } from '../types';

// A sink for draw commands. This is all a brush needs to draw into — the
// painting and overlay canvas controllers implement it, and so does the
// DrawCallBuffer used by SymmetryBrush to batch draw calls.
export interface DrawTarget {
  points(points: Point[], color: PaintColor): void;
  lines(lines: (LineH | LineV)[], color: PaintColor): void;
  quad(start: Point, end: Point, color: PaintColor): void;
  drawImage(points: Point[], brush: CustomBrush): void;
}

// A canvas controller is a DrawTarget that also owns and manages real canvas
// surfaces.
export interface CanvasController extends DrawTarget {
  attachMainCanvas(mainCanvas: HTMLCanvasElement): void;
  attachZoomCanvas(zoomCanvas: HTMLCanvasElement): void;
  clear(): void;
}
