import { useState } from 'react';
import { PointerState, Tool, ToolState } from '../types';

export function useTool(
  selectedTool: Tool,
  pointerState: PointerState,
  canvas: HTMLCanvasElement | null
): void {
  const [toolState, setToolState] = useState(new ToolState());
  if (canvas === null) {
    return;
  }
  selectedTool.use(pointerState, canvas, toolState, setToolState);
}
