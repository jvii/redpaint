import { Point } from '../../types';

export class CanvasState {
  public mainCanvasRef: React.MutableRefObject<HTMLCanvasElement | null> | null;
  public zoomCanvasRef: React.MutableRefObject<HTMLCanvasElement | null> | null;
  public canvasResolution: { width: number; height: number };
  public zoomFocusPoint: Point | null;

  public constructor() {
    this.mainCanvasRef = null;
    this.zoomCanvasRef = null;
    this.canvasResolution = { width: 0, height: 0 };
    this.zoomFocusPoint = null;
  }
}

export type CanvasStateAction =
  | {
      type: 'setMainCanvasRef' | 'setZoomCanvasRef';
      canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
    }
  | { type: 'setCanvasResolution'; canvasResolution: { width: number; height: number } }
  | { type: 'setZoomFocusPoint'; point: Point | null };

export function canvasStateReducer(state: CanvasState, action: CanvasStateAction): CanvasState {
  switch (action.type) {
    case 'setMainCanvasRef':
      return {
        ...state,
        mainCanvasRef: action.canvasRef,
      };
    case 'setZoomCanvasRef':
      return {
        ...state,
        zoomCanvasRef: action.canvasRef,
      };
    case 'setCanvasResolution':
      return {
        ...state,
        canvasResolution: action.canvasResolution,
      };
    case 'setZoomFocusPoint':
      return {
        ...state,
        zoomFocusPoint: action.point,
      };
    default:
      return state;
  }
}

export default CanvasState;
