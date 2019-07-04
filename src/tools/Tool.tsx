import { useReducer } from 'react';
import { PointerState, Color } from '../types';
import { ToolState, Action, toolStateReducer } from './ToolState';

export interface Tool {
  use(
    color: Color,
    pointerState: PointerState,
    canvas: HTMLCanvasElement,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  use(
    color: Color,
    pointerState: PointerState,
    canvas: HTMLCanvasElement,
    state?: ToolState,
    dispatch?: React.Dispatch<Action>
  ): void;
}

const initialToolState = new ToolState();

export function useTool(
  selectedTool: Tool,
  selectedColor: Color,
  pointerState: PointerState,
  canvas: HTMLCanvasElement | null
): void {
  const [state, dispatch] = useReducer(toolStateReducer, initialToolState);
  if (canvas === null) {
    return;
  }
  selectedTool.use(selectedColor, pointerState, canvas, state, dispatch);
}
