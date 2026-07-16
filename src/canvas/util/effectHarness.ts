// Dev/CDP harness (benchmark.ts's sibling): paints a deterministic scene,
// replays a scripted freehand stroke in the current brush mode, and returns
// the visible canvas as a PNG data URL for golden-image comparison.
import { Point } from '../../types';
import { Mode } from '../../overmind/brush/state';
import { symmetryBrush } from '../../brush/SymmetryBrush';
import { paintingCanvasController } from '../paintingCanvas/PaintingCanvasController';
import { overmind } from '../..';

// Vertical bars of palette colors 1..n across the canvas — a deterministic
// scene for the effect fixtures to smear/shade/blend into.
function effectScene(colors: number): string {
  const { width, height } = overmind.state.canvas.resolution;
  const barWidth = Math.floor(width / colors);
  for (let i = 0; i < colors; i++) {
    paintingCanvasController.quad(
      { x: i * barWidth, y: 0 },
      { x: i * barWidth + barWidth - 1, y: height - 1 },
      { kind: 'index', colorNumber: i + 1 }
    );
  }
  overmind.actions.undo.setUndoPoint();
  return paintingCanvasController.mainCanvas.toDataURL('image/png');
}

function effectStroke(points: Point[]): string {
  for (let i = 1; i < points.length; i++) {
    symmetryBrush.drawLine(points[i - 1], points[i], paintingCanvasController);
  }
  paintingCanvasController.endEffectStroke();
  overmind.actions.undo.setUndoPoint();
  return paintingCanvasController.mainCanvas.toDataURL('image/png');
}

function setMode(mode: Mode): string {
  overmind.actions.brush.setMode(mode);
  return overmind.state.brush.mode;
}

declare global {
  interface Window {
    __redpaintEffectScene: typeof effectScene;
    __redpaintEffectStroke: typeof effectStroke;
    __redpaintSetMode: typeof setMode;
  }
}

window.__redpaintEffectScene = effectScene;
window.__redpaintEffectStroke = effectStroke;
window.__redpaintSetMode = setMode;

export {};
