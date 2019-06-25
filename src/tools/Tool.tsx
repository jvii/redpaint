import { useReducer } from 'react';
import { PointerState } from '../types';
import { ToolState, Action, toolStateReducer } from './ToolState';

export interface Tool {
  use(
    pointerState: PointerState,
    canvas: HTMLCanvasElement,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  use(
    pointerState: PointerState,
    canvas: HTMLCanvasElement,
    state?: ToolState,
    dispatch?: React.Dispatch<Action>
  ): void;
}

export function useTool(
  selectedTool: Tool,
  pointerState: PointerState,
  canvas: HTMLCanvasElement | null
): void {
  const [state, dispatch] = useReducer(toolStateReducer, new ToolState());
  if (canvas === null) {
    return;
  }
  selectedTool.use(pointerState, canvas, state, dispatch);
}
