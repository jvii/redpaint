import { Point } from '../../types';

export class CanvasState {
  public sourceCanvas: HTMLCanvasElement;
  public sourceOverlayCanvas: HTMLCanvasElement;
  public resolution: { width: number; height: number };
  public scrollFocusPoint: Point | null;
  public zoomFocusPoint: Point | null;
  public lastModified: {
    timestamp: number;
    modifiedBy: 'undoOrRedo' | 'zoomCanvas' | 'mainCanvas';
  };
  public lastModifiedOverlay: {
    timestamp: number;
    modifiedBy: 'zoomCanvas' | 'mainCanvas';
  };

  public constructor() {
    // create placeholder HTMLCanvasElements to avoid null values
    this.sourceCanvas = document.createElement('canvas');
    this.sourceOverlayCanvas = document.createElement('canvas');
    this.lastModified = { timestamp: 0, modifiedBy: 'mainCanvas' };
    this.lastModifiedOverlay = { timestamp: 0, modifiedBy: 'mainCanvas' };
    this.resolution = { width: 0, height: 0 };
    this.scrollFocusPoint = null;
    this.zoomFocusPoint = null;
  }
}

export type CanvasStateAction =
  | { type: 'setResolution'; resolution: { width: number; height: number } }
  | { type: 'setScrollFocusPoint'; point: Point | null }
  | { type: 'setZoomFocusPoint'; point: Point | null }
  | {
      type: 'setModified';
      canvas: HTMLCanvasElement;
      modifiedBy: 'undoOrRedo' | 'zoomCanvas' | 'mainCanvas';
    }
  | {
      type: 'setOverlayModified';
      canvas: HTMLCanvasElement;
      modifiedBy: 'zoomCanvas' | 'mainCanvas';
    };

export function canvasStateReducer(state: CanvasState, action: CanvasStateAction): CanvasState {
  switch (action.type) {
    case 'setModified':
      return {
        ...state,
        sourceCanvas: action.canvas,
        lastModified: { timestamp: Date.now(), modifiedBy: action.modifiedBy },
      };
    case 'setOverlayModified':
      return {
        ...state,
        sourceOverlayCanvas: action.canvas,
        lastModifiedOverlay: { timestamp: Date.now(), modifiedBy: action.modifiedBy },
      };
    case 'setResolution':
      return {
        ...state,
        resolution: action.resolution,
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
