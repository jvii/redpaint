import { Color } from '../../types';
import { createPalette } from '../../components/palette/util';

export type State = {
  palette: {
    [id: string]: Color;
  };
  readonly paletteArray: Color[];
  foregroundColorId: string;
  backgroundColorId: string;
  readonly foregroundColor: Color;
  readonly backgroundColor: Color;
};

export const state: State = {
  palette: createPalette(100),
  get paletteArray(this: State): Color[] {
    return Object.values(this.palette);
  },
  foregroundColorId: '0',
  backgroundColorId: '20',
  get foregroundColor(this: State): Color {
    return this.palette[this.foregroundColorId];
  },
  get backgroundColor(this: State): Color {
    return this.palette[this.backgroundColorId];
  },
};
