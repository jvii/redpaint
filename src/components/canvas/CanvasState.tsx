/// This thing only exists to hold the refs of different canvas elements
/// TODO: maybe use forwarding refs instead?
export class CanvasState {
  public mainCanvas: HTMLCanvasElement;
  public mainOverlayCanvas: HTMLCanvasElement;
  public zoomCanvas: HTMLCanvasElement;
  public zoomOverlayCanvas: HTMLCanvasElement;

  public constructor() {
    // create placeholder HTMLCanvasElements to avoid null values
    this.mainCanvas = document.createElement('canvas');
    this.mainOverlayCanvas = document.createElement('canvas');
    this.zoomCanvas = document.createElement('canvas');
    this.zoomOverlayCanvas = document.createElement('canvas');
  }
}

export interface CanvasStateAction {
  type: 'setMainCanvas' | 'setZoomCanvas';
  elements: { canvas: HTMLCanvasElement; overlay: HTMLCanvasElement };
}

export function canvasStateReducer(state: CanvasState, action: CanvasStateAction): CanvasState {
  switch (action.type) {
    case 'setMainCanvas':
      return {
        ...state,
        mainCanvas: action.elements.canvas,
        mainOverlayCanvas: action.elements.overlay,
      };
    case 'setZoomCanvas':
      return {
        ...state,
        zoomCanvas: action.elements.canvas,
        zoomOverlayCanvas: action.elements.overlay,
      };
    default:
      return state;
  }
}

export default CanvasState;
