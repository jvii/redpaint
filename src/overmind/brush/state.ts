import { Brush } from '../../brush/Brush';
import { PixelBrush } from '../../brush/PixelBrush';
import { BuiltInBrushId } from '../../brush/BuiltInBrushes';

export type State = {
  brush: Brush;
  selectedBuiltInBrushId: BuiltInBrushId;
};

export const state: State = {
  brush: new PixelBrush(),
  selectedBuiltInBrushId: 1,
};
