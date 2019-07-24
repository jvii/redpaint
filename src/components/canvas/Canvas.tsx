import React, { useRef, useEffect, useReducer } from 'react';
import { CanvasState, Action } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { ToolState, toolStateReducer } from '../../tools/ToolState';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<Action>;
  canvasState: CanvasState;
  toolbarState: ToolbarState;
  paletteState: PaletteState;
  isZoomCanvas: boolean;
}

const initialToolState = new ToolState();

export function Canvas({
  canvasDispatch,
  canvasState,
  toolbarState,
  paletteState,
  isZoomCanvas,
}: Props): JSX.Element {
  const canvasRef = useRef(null);
  useEffect((): void => {
    console.log('setting canvas size');
    canvasDispatch({
      type: isZoomCanvas ? 'setZoomCanvasRef' : 'setMainCanvasRef',
      canvasRef: canvasRef,
    });
    if (isZoomCanvas) {
      return;
    }
    canvasDispatch({
      type: 'setCanvasResolution',
      canvasResolution: { width: window.innerWidth - 50, height: window.innerHeight - 3 },
    });
  }, [canvasRef]);

  const [toolState, toolStatedispatch] = useReducer(toolStateReducer, initialToolState);

  const zoomFactor = isZoomCanvas ? 30 : 1;
  const CSSZoom = {
    width: canvasState.canvasResolution.width * zoomFactor,
    height: canvasState.canvasResolution.height * zoomFactor,
  };

  return (
    <canvas
      className="Canvas"
      ref={canvasRef}
      width={canvasState.canvasResolution.width}
      height={canvasState.canvasResolution.height}
      style={CSSZoom}
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
