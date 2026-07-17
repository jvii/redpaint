import { Context } from '../../overmind';
import { Mode, BuiltInBrushId, builtInBrushes } from './state';
import { CustomBrush } from '../../brush/CustomBrush';
import { brushHistory } from '../../brush/BrushHistory';
import { DrawingToolId } from '../toolbox/state';

// DPaint switches away to (dotted) freehand when a built-in brush is picked
// while a fill tool is active, since a brush stamp and an area fill don't
// combine — this app switches to plain freehand instead.
const TOOLS_INCOMPATIBLE_WITH_BRUSHES: DrawingToolId[] = [
  'floodFill',
  'rectangleFilled',
  'circleFilled',
  'ellipseFilled',
  'polygonFilled',
];

export const selectBuiltInBrush = (context: Context, brushNumber: BuiltInBrushId): void => {
  context.state.brush.selectedBuiltInBrushId = brushNumber;
  brushHistory.set(builtInBrushes[brushNumber]);
  // Matte and Repl are custom-brush-only (disabled in the menu for built-ins,
  // since a built-in shape has no inherent captured color) — falling back to
  // Color there matches the old single-Matte/Color world. Every other mode
  // (the canvas-reading effects, Cycle) works fine with a built-in shape, so
  // switching a brush mid-effect shouldn't silently reset it to Color.
  if (context.state.brush.mode === 'Matte' || context.state.brush.mode === 'Repl') {
    context.actions.brush.setMode('Color');
  } else {
    context.actions.brush.setMode(context.state.brush.mode);
  }
  if (
    TOOLS_INCOMPATIBLE_WITH_BRUSHES.includes(context.state.toolbox.activeToolId as DrawingToolId)
  ) {
    context.actions.toolbox.setSelectedDrawingTool('freeHand');
  }
};

// Called when a custom (captured or loaded) brush becomes the current brush
export const clearBuiltInBrushSelection = (context: Context): void => {
  context.state.brush.selectedBuiltInBrushId = null;
};

export const setMode = (context: Context, mode: Mode): void => {
  context.state.brush.mode = mode;
  const brush = brushHistory.current;
  if (brush instanceof CustomBrush) {
    if (mode === 'Color' || mode === 'Cycle') {
      // Cycle recolors the whole shape per stamp, like Color with a rotating
      // color — the FG-colorized bitmap is the right resting state
      brush.setFGColor();
      brush.setBGColor();
      brush.toFGColor();
    } else {
      // Matte, Repl and the canvas-reading effects all stamp from the
      // pristine matte bitmap (the effects use it purely as the shape mask)
      brush.setBGColor();
      brush.toMatte();
    }
  }
};

export const toFGBrush = (context: Context): void => {
  const brush = brushHistory.current;
  if (context.state.brush.mode === 'Color' && brush instanceof CustomBrush) {
    brush.toFGColor();
  }
  if (context.state.brush.mode === 'Matte' && brush instanceof CustomBrush) {
    brush.toMatte();
  }
};

export const toBGBrush = (context: Context): void => {
  const brush = brushHistory.current;
  if (brush instanceof CustomBrush) {
    brush.toBGColor();
  }
};
