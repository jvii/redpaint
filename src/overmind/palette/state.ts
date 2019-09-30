import { Color } from '../../types';
import { Derive } from 'overmind';
import { createPalette } from '../../components/palette/util';

export type State = {
  palette: {
    [id: string]: Color;
  };
  //paletteArray: Derive<State, Color[]>
  readonly paletteArray: Color[];
  foregroundColorId: string;
  backgroundColorId: string;
  readonly foregroundColor: Color;
  readonly backgroundColor: Color;
};

export const state: State = {
  palette: createPalette(100),
  get paletteArray(this: State) {
    return Object.values(this.palette);
  },
  foregroundColorId: '0',
  backgroundColorId: '20',
  get foregroundColor(this: State) {
    return this.palette[this.foregroundColorId];
  },
  get backgroundColor(this: State) {
    return this.palette[this.backgroundColorId];
  },
};
