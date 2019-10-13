import { Point } from '../types';

export class ToolState {
  public lineToolState: LineToolState;
  public freehandToolState: FreehandToolState;
  public zoomToolState: ZoomToolState;
  public brushSelectorState: BrushSelectorState;
  public constructor() {
    this.lineToolState = new LineToolState();
    this.freehandToolState = new FreehandToolState();
    this.zoomToolState = new ZoomToolState();
    this.brushSelectorState = new BrushSelectorState();
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

export class ZoomToolState {
  public zoomInitialPoint: Point | null;
  public constructor() {
    this.zoomInitialPoint = null;
  }
}

export class BrushSelectorState {
  public startingPosition: Point | null;
  public dataURL: string;
  public constructor() {
    this.startingPosition = null;
    this.dataURL = '';
  }
}

export type Action =
  | { type: 'lineToolStart'; point: Point | null }
  | { type: 'freehandToolPrevious'; point: Point | null }
  | { type: 'zoomInitialPoint'; point: Point | null }
  | { type: 'brushSelectionStart'; point: Point | null }
  | { type: 'brushSelectionComplete'; dataURL: string };

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
    case 'zoomInitialPoint':
      return {
        ...state,
        zoomToolState: {
          ...state.zoomToolState,
          zoomInitialPoint: action.point,
        },
      };
    case 'brushSelectionStart':
      return {
        ...state,
        brushSelectorState: {
          ...state.brushSelectorState,
          startingPosition: action.point,
        },
      };
    case 'brushSelectionComplete':
      return {
        ...state,
        brushSelectorState: {
          ...state.brushSelectorState,
          dataURL: action.dataURL,
        },
      };
    default:
      return state;
  }
}

export default ToolState;
