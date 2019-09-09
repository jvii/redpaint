import { Point } from '../../types';

export class CanvasState {
  public mainCanvasRef: HTMLCanvasElement;
  public zoomCanvasRef: HTMLCanvasElement;
  public mainOverlayCanvasRef: HTMLCanvasElement;
  public zoomOverlayCanvasRef: HTMLCanvasElement;
  public canvasResolution: { width: number; height: number };
  public scrollFocusPoint: Point | null;
  public zoomFocusPoint: Point | null;

  public constructor() {
    // create placeholder HTMLCanvasElements to avoid null values
    this.mainCanvasRef = document.createElement('canvas');
    this.zoomCanvasRef = document.createElement('canvas');
    this.mainOverlayCanvasRef = document.createElement('canvas');
    this.zoomOverlayCanvasRef = document.createElement('canvas');
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
      canvas: HTMLCanvasElement;
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
