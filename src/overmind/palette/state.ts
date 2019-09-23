import { Color } from '../../types';
import { Derive } from 'overmind'
import { createPalette2 } from '../../components/palette/util';

export type State = {
  palette: {
    [id: string]: Color;
  };
  paletteArray: Derive<State, Color[]>
  foregroundColorId: string;
  backgroundColorId: string;
  foregroundColor: Color;
  backgroundColor: Color;
};

export const state: State = {
  palette: createPalette2(100),
  paletteArray: state => Object.values(state.palette),
  foregroundColorId: '0',
  backgroundColorId: '20',
  get foregroundColor(this: State) {
    return this.palette[this.foregroundColorId];
  },
  get backgroundColor(this: State) {
    return this.palette[this.backgroundColorId];
  },
};
