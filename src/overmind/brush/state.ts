import { Brush } from '../../brush/Brush';
import { PixelBrush } from '../../brush/PixelBrush';
import { createBuiltInBrush } from '../../brush/BuiltInBrushFactory';

export type Mode = 'Matte' | 'Color';
export type BuiltInBrushId = keyof typeof builtInBrushes;

class BrushHistory {
  constructor() {
    this.history = [];
    this.current = new PixelBrush();
  }
  history: Brush[];
  current: Brush;

  set(newBrush: Brush): void {
    this.history.push(this.current);
    this.current = newBrush;
  }
}

export const brushHistory = new BrushHistory();

export const builtInBrushes = {
  1: new PixelBrush(),
  2: createBuiltInBrush('dot3x3'),
  3: createBuiltInBrush('dot5x5'),
  4: createBuiltInBrush('dot7x7'),
  5: createBuiltInBrush('square2x2'),
  6: createBuiltInBrush('square4x4'),
  7: createBuiltInBrush('square6x6'),
  8: createBuiltInBrush('square8x8'),
  9: createBuiltInBrush('dither3x3'),
  10: createBuiltInBrush('dither7x6'),
};

export type State = {
  readonly brush: Brush;
  selectedBuiltInBrushId: BuiltInBrushId;
  mode: Mode;
};

export const state: State = {
  get brush(this: State): Brush {
    return brushHistory.current;
  },
  selectedBuiltInBrushId: 1,
  mode: 'Color',
};
