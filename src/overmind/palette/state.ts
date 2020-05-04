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
  palette: createPalette(32),
  get paletteArray(this: State): Color[] {
    return Object.values(this.palette);
  },
  foregroundColorId: '20',
  backgroundColorId: '0',
  get foregroundColor(this: State): Color {
    return this.palette[this.foregroundColorId];
  },
  get backgroundColor(this: State): Color {
    return this.palette[this.backgroundColorId];
  },
};
