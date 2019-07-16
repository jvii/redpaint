import { Color } from '../../types';
import { createPalette } from './util';

export class PaletteState {
  public foregroundColor: Color;
  public backgroundColor: Color;
  public foregroundColorKey: number;
  public backgroundColorKey: number;
  public palette: Color[];

  public constructor() {
    this.palette = createPalette(200);

    this.foregroundColor = this.palette[0];
    this.foregroundColorKey = 0;

    this.backgroundColor = this.palette[100];
    this.backgroundColorKey = 100;
  }
}

export type Action =
  | { type: 'setForegroundColor'; color: Color; colorKey: number }
  | { type: 'setBackgroundColor'; color: Color; colorKey: number };

export function paletteStateReducer(state: PaletteState, action: Action): PaletteState {
  switch (action.type) {
    case 'setForegroundColor':
      return {
        ...state,
        foregroundColor: action.color,
        foregroundColorKey: action.colorKey,
      };
    case 'setBackgroundColor':
      return {
        ...state,
        backgroundColor: action.color,
        backgroundColorKey: action.colorKey,
      };
    default:
      return state;
  }
}

export default PaletteState;
