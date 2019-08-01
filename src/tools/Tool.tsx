import { ToolState, Action } from './ToolState';
import { PaletteState } from '../components/palette/PaletteState';

export interface Tool {
  onClick(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  onContextMenu(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  onMouseMove(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    setEdited: React.Dispatch<React.SetStateAction<number>>,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  onMouseUp(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  onMouseDown(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  onMouseLeave(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  onMouseEnter(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
}
