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
    // no branching history, i.e. always clears the buffer above currentIndex (redos)
    case 'setUndoPoint':
      return {
        ...state,
        currentIndex: state.currentIndex === null ? 0 : ++state.currentIndex,
        undoBuffer:
          state.currentIndex === null
            ? [action.canvasAsBlob]
            : state.undoBuffer.slice(0, state.currentIndex + 1).concat(action.canvasAsBlob),
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
        currentIndex: getNewIndexOnRedo(state.currentIndex, state.undoBuffer.length),
        lastUndoRedoTime: Date.now(),
      };
    default:
      return state;
  }
}

function getNewIndexOnRedo(oldIndex: number | null, bufferLength: number): number {
  if (oldIndex === null) {
    return 0;
  }
  if (oldIndex === bufferLength - 1) {
    return oldIndex;
  }
  return ++oldIndex;
}

export default UndoState;
