import { Color } from '../types';
import { ToolState, Action } from './ToolState';

export interface Tool {
  onClick(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  onMouseMove(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  onMouseUp(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  onMouseDown(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  onMouseLeave(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  onMouseEnter(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
}
