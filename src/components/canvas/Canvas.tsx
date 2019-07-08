import React, { useRef, useEffect, useReducer } from 'react';
import { Action } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { ToolState, toolStateReducer } from '../../tools/ToolState';
import './Canvas.css';

interface Props {
  dispatch: React.Dispatch<Action>;
  toolbarState: ToolbarState;
  paletteState: PaletteState;
}

const initialToolState = new ToolState();

function Canvas({ dispatch, toolbarState, paletteState }: Props): JSX.Element {
  const canvasRef = useRef(null);
  useEffect((): void => {
    dispatch({ type: 'setCanvasRef', canvasRef: canvasRef });
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
          paletteState.foregroundColor,
          toolState,
          toolStatedispatch
        )
      }
      onMouseMove={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseMove(
          event,
          canvasRef.current,
          paletteState.foregroundColor,
          toolState,
          toolStatedispatch
        )
      }
      onMouseDown={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseDown(
          event,
          canvasRef.current,
          paletteState.foregroundColor,
          toolState,
          toolStatedispatch
        )
      }
      onMouseUp={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseUp(
          event,
          canvasRef.current,
          paletteState.foregroundColor,
          toolState,
          toolStatedispatch
        )
      }
      onMouseLeave={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseUp(
          event,
          canvasRef.current,
          paletteState.foregroundColor,
          toolState,
          toolStatedispatch
        )
      }
      onMouseEnter={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseEnter(
          event,
          canvasRef.current,
          paletteState.foregroundColor,
          toolState,
          toolStatedispatch
        )
      }
    />
  );
}

export default Canvas;
