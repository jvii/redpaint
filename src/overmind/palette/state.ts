import { Color } from '../../types';
import { createPalette } from '../../components/palette/util';
import { derived } from 'overmind';

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
  paletteArray: derived((state: State) => Object.values(state.palette)),
  foregroundColorId: '20',
  backgroundColorId: '1',
  foregroundColor: derived((state: State) => state.palette[state.foregroundColorId]),
  backgroundColor: derived((state: State) => state.palette[state.backgroundColorId]),
};
