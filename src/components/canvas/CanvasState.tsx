export class CanvasState {
  public mainCanvasRef: React.MutableRefObject<null> | null;
  public zoomCanvasRef: React.MutableRefObject<null> | null;
  public canvasResolution: { width: number; height: number };
  public constructor() {
    this.mainCanvasRef = null;
    this.zoomCanvasRef = null;
    this.canvasResolution = { width: 0, height: 0 };
  }
}

export type Action =
  | { type: 'setMainCanvasRef' | 'setZoomCanvasRef'; canvasRef: React.MutableRefObject<null> }
  | { type: 'setCanvasResolution'; canvasResolution: { width: number; height: number } };

export function canvasStateReducer(state: CanvasState, action: Action): CanvasState {
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
    default:
      return state;
  }
}

export default CanvasState;
