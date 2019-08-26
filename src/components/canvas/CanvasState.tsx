import { Point } from '../../types';

export class CanvasState {
  public mainCanvasRef: HTMLCanvasElement | null;
  public zoomCanvasRef: HTMLCanvasElement | null;
  public mainOverlayCanvasRef: HTMLCanvasElement | null;
  public zoomOverlayCanvasRef: HTMLCanvasElement | null;
  public canvasResolution: { width: number; height: number };
  public scrollFocusPoint: Point | null;
  public zoomFocusPoint: Point | null;

  public constructor() {
    this.mainCanvasRef = null;
    this.zoomCanvasRef = null;
    this.mainOverlayCanvasRef = null;
    this.zoomOverlayCanvasRef = null;
    this.canvasResolution = { width: 0, height: 0 };
    this.scrollFocusPoint = null;
    this.zoomFocusPoint = null;
  }
}

export type CanvasStateAction =
  | {
      type:
        | 'setMainCanvasRef'
        | 'setZoomCanvasRef'
        | 'setMainOverlayCanvasRef'
        | 'setZoomOverlayCanvasRef';
      canvas: HTMLCanvasElement | null;
    }
  | { type: 'setCanvasResolution'; canvasResolution: { width: number; height: number } }
  | { type: 'setScrollFocusPoint'; point: Point | null }
  | { type: 'setZoomFocusPoint'; point: Point | null };

export function canvasStateReducer(state: CanvasState, action: CanvasStateAction): CanvasState {
  switch (action.type) {
    case 'setMainCanvasRef':
      return {
        ...state,
        mainCanvasRef: action.canvas,
      };
    case 'setZoomCanvasRef':
      return {
        ...state,
        zoomCanvasRef: action.canvas,
      };
    case 'setMainOverlayCanvasRef':
      return {
        ...state,
        mainOverlayCanvasRef: action.canvas,
      };
    case 'setZoomOverlayCanvasRef':
      return {
        ...state,
        zoomOverlayCanvasRef: action.canvas,
      };
    case 'setCanvasResolution':
      return {
        ...state,
        canvasResolution: action.canvasResolution,
      };
    case 'setScrollFocusPoint':
      return {
        ...state,
        scrollFocusPoint: action.point,
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
