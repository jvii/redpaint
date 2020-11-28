import { Color } from '../../types';
import { createPalette } from '../../components/palette/util';

export type State = {
  palette: {
    [id: string]: Color; // the color index (integer as string), starting from "1"
  };
  readonly paletteArray: Color[];
  foregroundColorId: string;
  backgroundColorId: string;
  readonly foregroundColor: Color;
  readonly backgroundColor: Color;
};

export const state: State = {
  palette: createPalette(32),
  get paletteArray(): Color[] {
    return Object.values(state.palette);
  },
  foregroundColorId: '20',
  backgroundColorId: '1',
  get foregroundColor(): Color {
    return this.palette[this.foregroundColorId];
  },
  get backgroundColor(): Color {
    return this.palette[this.backgroundColorId];
  },
};
