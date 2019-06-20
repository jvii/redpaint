import { Point } from '../types';

export class LineToolState {
  public startingPosition: Point | null;
  public constructor() {
    this.startingPosition = null;
  }
}

export class ToolState {
  public lineToolState: LineToolState;
  public constructor() {
    this.lineToolState = new LineToolState();
  }
}

export type Action =
  | { type: 'lineToolStart'; point: Point | null }
  | { type: 'other'; param: string };

export function toolStateReducer(state: ToolState, action: Action): ToolState {
  switch (action.type) {
    case 'lineToolStart':
      return {
        ...state,
        lineToolState: {
          ...state.lineToolState,
          startingPosition: action.point,
        },
      };
    case 'other':
      return state;
  }
}
