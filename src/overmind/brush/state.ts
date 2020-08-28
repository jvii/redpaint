import { PixelBrush } from '../../brush/PixelBrush';
import { createBuiltInBrush } from '../../brush/BuiltInBrushFactory';

export type Mode = 'Matte' | 'Color';
export type BuiltInBrushId = keyof typeof builtInBrushes;

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
  selectedBuiltInBrushId: BuiltInBrushId;
  mode: Mode;
};

export const state: State = {
  selectedBuiltInBrushId: 1,
  mode: 'Color',
};
