import { Color } from '../../types';
import { createPalette } from './util';

export class PaletteState {
  public foregroundColor: Color;
  public backgroundColor: Color;
  public palette: Color[];
  public constructor() {
    this.foregroundColor = { r: 255, g: 0, b: 0 };
    this.backgroundColor = { r: 255, g: 255, b: 255 };
    this.palette = createPalette(200);
  }
}

export type Action =
  | { type: 'setForegroundColor'; color: Color }
  | { type: 'setBackgroundColor'; color: Color };

export function paletteStateReducer(state: PaletteState, action: Action): PaletteState {
  switch (action.type) {
    case 'setForegroundColor':
      return {
        ...state,
        foregroundColor: action.color,
      };
    case 'setBackgroundColor':
      return {
        ...state,
        backgroundColor: action.color,
      };
  }
}

export default PaletteState;
