import { Point } from '../types';
import { Tool } from './Tool';
import { FreehandTool } from './FreehandTool';

export class ToolState {
  public activeTool: Tool;
  public lineToolState: LineToolState;
  public freehandToolState: FreehandToolState;
  public zoomToolState: ZoomToolState;
  public constructor() {
    this.activeTool = new FreehandTool();
    this.lineToolState = new LineToolState();
    this.freehandToolState = new FreehandToolState();
    this.zoomToolState = new ZoomToolState();
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

export type Action =
  | { type: 'setActiveTool'; tool: Tool }
  | { type: 'lineToolStart'; point: Point | null }
  | { type: 'freehandToolPrevious'; point: Point | null }
  | { type: 'zoomInitialPoint'; point: Point | null };

export function toolStateReducer(state: ToolState, action: Action): ToolState {
  switch (action.type) {
    case 'setActiveTool':
      return {
        ...state,
        activeTool: action.tool,
      };
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
    default:
      return state;
  }
}

export default ToolState;
