import React, { useRef, useEffect, useReducer } from 'react';
import { Action } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { ToolState, toolStateReducer } from '../../tools/ToolState';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<Action>;
  toolbarState: ToolbarState;
  paletteState: PaletteState;
}

const initialToolState = new ToolState();

function Canvas({ canvasDispatch, toolbarState, paletteState }: Props): JSX.Element {
  const canvasRef = useRef(null);
  useEffect((): void => {
    canvasDispatch({ type: 'setCanvasRef', canvasRef: canvasRef });
  }, [canvasRef]);

  const [toolState, toolStatedispatch] = useReducer(toolStateReducer, initialToolState);

  return (
    <canvas
      ref={canvasRef}
      className="Canvas"
      width={window.innerWidth - 50}
      height={window.innerHeight}
      onClick={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onClick(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStatedispatch
        )
      }
      onMouseMove={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseMove(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStatedispatch
        )
      }
      onMouseDown={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseDown(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStatedispatch
        )
      }
      onMouseUp={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseUp(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStatedispatch
        )
      }
      onMouseLeave={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseUp(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStatedispatch
        )
      }
      onMouseEnter={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseEnter(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStatedispatch
        )
      }
      onContextMenu={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onContextMenu(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStatedispatch
        )
      }
    />
  );
}

export default Canvas;
