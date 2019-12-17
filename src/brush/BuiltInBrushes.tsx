import { PixelBrush } from './PixelBrush';
import { createBuiltInBrush } from './BuiltInBrushFactory';

export const builtInBrushes = {
  1: new PixelBrush(),
  2: createBuiltInBrush('cross'),
  3: createBuiltInBrush('dot1'),
  4: createBuiltInBrush('dot2'),
};

export type BuiltInBrushId = keyof typeof builtInBrushes;
