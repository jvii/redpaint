import { Brush } from '../../brush/Brush';
import { PixelBrush } from '../../brush/PixelBrush';
//import { CustomBrush } from '../../brush/CustomBrush';

export type State = {
  brush: Brush;
};

export const state: State = {
  brush: new PixelBrush(),
};
