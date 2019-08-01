import { Point } from '../types';

export class ToolState {
  public lineToolState: LineToolState;
  public freehandToolState: FreehandToolState;
  public constructor() {
    this.lineToolState = new LineToolState();
    this.freehandToolState = new FreehandToolState();
  }
}
export class FreehandToolState {
  public previousPosition: Point | null;
  public constructor() {
    this.previousPosition = null;
  }
}

export class LineToolState {
  public startingPosition: Point | null;
  public constructor() {
    this.startingPosition = null;
  }
}

export type Action =
  | { type: 'lineToolStart'; point: Point | null }
  | { type: 'freehandToolPrevious'; point: Point | null };

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
    case 'freehandToolPrevious':
      return {
        ...state,
        freehandToolState: {
          ...state.freehandToolState,
          previousPosition: action.point,
        },
      };
    default:
      return state;
  }
}

export default ToolState;
