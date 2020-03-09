import { Brush } from '../../brush/Brush';
import { PixelBrush } from '../../brush/PixelBrush';
import { createBuiltInBrush } from '../../brush/BuiltInBrushFactory';

export type Mode = 'Matte' | 'Color';
export type BuiltInBrushId = keyof typeof builtInBrushes;

export const builtInBrushes = {
  1: new PixelBrush(),
  2: createBuiltInBrush('cross'),
  3: createBuiltInBrush('dot1'),
  4: createBuiltInBrush('dot2'),
};

export type State = {
  brush: Brush;
  selectedBuiltInBrushId: BuiltInBrushId;
  readonly selectedBuiltInBrush: Brush;
  mode: Mode;
};

export const state: State = {
  brush: new PixelBrush(),
  selectedBuiltInBrushId: 1,
  get selectedBuiltInBrush(): Brush {
    return builtInBrushes[this.selectedBuiltInBrushId];
  },
  mode: 'Color',
};
