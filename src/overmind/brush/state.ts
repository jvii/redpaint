import { Brush } from '../../brush/Brush';
import { PixelBrush } from '../../brush/PixelBrush';
import { createBuiltInBrush } from '../../brush/BuiltInBrushFactory';

export type State = {
  brush: Brush;
  builtInBrushes: { [id: number]: Brush };
};

export const state: State = {
  brush: new PixelBrush(),
  builtInBrushes: {
    1: new PixelBrush(),
    2: createBuiltInBrush('cross'),
    3: createBuiltInBrush('dot1'),
    4: createBuiltInBrush('dot2'),
  },
};
