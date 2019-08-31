export class UndoState {
  public undoBuffer: Blob[];
  public currentIndex: number | null;
  public lastUndoRedoTime: number;

  public constructor() {
    this.undoBuffer = [];
    this.currentIndex = null;
    this.lastUndoRedoTime = Date.now();
  }
}

export type UndoStateAction =
  | { type: 'setUndoPoint'; canvasAsBlob: Blob }
  | { type: 'undo' }
  | { type: 'redo' };

export function undoStateReducer(state: UndoState, action: UndoStateAction): UndoState {
  switch (action.type) {
    case 'setUndoPoint':
      return {
        ...state,
        undoBuffer:
          state.currentIndex === null
            ? [action.canvasAsBlob]
            : state.undoBuffer.slice(0, state.currentIndex + 1).concat(action.canvasAsBlob),
        currentIndex: state.currentIndex === null ? 0 : ++state.currentIndex,
      };
    case 'undo':
      return {
        ...state,
        currentIndex: !state.currentIndex ? 0 : --state.currentIndex,
        lastUndoRedoTime: Date.now(),
      };
    case 'redo':
      return {
        ...state,
        currentIndex:
          state.currentIndex === state.undoBuffer.length - 1
            ? state.currentIndex
            : state.currentIndex === null
            ? 0
            : ++state.currentIndex,
        lastUndoRedoTime: Date.now(),
      };
    default:
      return state;
  }
}

export default UndoState;
