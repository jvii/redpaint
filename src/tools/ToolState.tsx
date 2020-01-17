import { Point } from '../types';

// Local state for managing transient tool state.

export class ToolState {
  public lineToolState: LineToolState;
  public curveToolState: CurveToolState;
  public rectangleToolState: RectangleToolState;
  public circleToolState: CircleToolState;
  public freehandToolState: FreehandToolState;
  public zoomToolState: ZoomToolState;
  public brushSelectorState: BrushSelectorState;
  public constructor() {
    this.lineToolState = new LineToolState();
    this.curveToolState = new CurveToolState();
    this.rectangleToolState = new RectangleToolState();
    this.circleToolState = new CircleToolState();
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

export class CurveToolState {
  public startingPosition: Point | null;
  public endPosition: Point | null;
  public constructor() {
    this.startingPosition = null;
    this.endPosition = null;
  }
}

export class RectangleToolState {
  public startingPosition: Point | null;
  public constructor() {
    this.startingPosition = null;
  }
}

export class CircleToolState {
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
  | { type: 'curveToolStart'; point: Point | null }
  | { type: 'curveToolEnd'; point: Point | null }
  | { type: 'rectangleToolStart'; point: Point | null }
  | { type: 'circleToolStart'; point: Point | null }
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
    case 'curveToolStart':
      return {
        ...state,
        curveToolState: {
          ...state.curveToolState,
          startingPosition: action.point,
        },
      };
    case 'curveToolEnd':
      return {
        ...state,
        curveToolState: {
          ...state.curveToolState,
          endPosition: action.point,
        },
      };
    case 'rectangleToolStart':
      return {
        ...state,
        rectangleToolState: {
          ...state.rectangleToolState,
          startingPosition: action.point,
        },
      };
    case 'circleToolStart':
      return {
        ...state,
        circleToolState: {
          ...state.circleToolState,
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
          dataURL: '',
          startingPosition: action.point,
        },
      };
    case 'brushSelectionComplete':
      return {
        ...state,
        brushSelectorState: {
          ...state.brushSelectorState,
          dataURL: action.dataURL,
          startingPosition: null,
        },
      };
    default:
      return state;
  }
}

export default ToolState;
