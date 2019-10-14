import { Brush } from '../../brush/Brush';
import { PixelBrush } from '../../brush/PixelBrush';

export type State = {
  brush: Brush;
};

export const state: State = {
  brush: new PixelBrush(),
};
