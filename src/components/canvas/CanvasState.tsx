export class CanvasState {
  public canvasRef: React.MutableRefObject<null> | null;
  public constructor() {
    this.canvasRef = null;
  }
}

export type Action = { type: 'setCanvasRef'; canvasRef: React.MutableRefObject<null> };

export function canvasStateReducer(state: CanvasState, action: Action): CanvasState {
  switch (action.type) {
    case 'setCanvasRef':
      return {
        ...state,
        canvasRef: action.canvasRef,
      };
    default:
      return state;
  }
}

export default CanvasState;
