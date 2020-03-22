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
  2: createBuiltInBrush('cross'),
  3: createBuiltInBrush('dot1'),
  4: createBuiltInBrush('dot2'),
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
