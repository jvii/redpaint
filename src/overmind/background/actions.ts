import { Context } from '../../overmind';
import { background } from '../../canvas/Background';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';

export const fix = (context: Context): void => {
  const canvas = paintingCanvasController.getCanvasColorIndex();
  if (!canvas) {
    return;
  }
  background.fix(canvas);
  context.state.background.fixed = true;
};

export const free = (context: Context): void => {
  background.free();
  context.state.background.fixed = false;
};
