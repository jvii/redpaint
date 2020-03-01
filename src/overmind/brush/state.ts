import { Brush } from '../../brush/Brush';
import { PixelBrush } from '../../brush/PixelBrush';
import { BuiltInBrushId } from '../../brush/BuiltInBrushes';

export type Mode = 'Matte' | 'Color';

export type State = {
  brush: Brush;
  selectedBuiltInBrushId: BuiltInBrushId;
  mode: Mode;
};

export const state: State = {
  brush: new PixelBrush(),
  selectedBuiltInBrushId: 1,
  mode: 'Color',
};
