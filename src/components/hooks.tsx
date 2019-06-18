import { useReducer } from 'react';
import { PointerState, Tool } from '../types';
import { ToolState, toolStateReducer } from '../tools/ToolState';

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
