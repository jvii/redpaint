import React, { useRef, useEffect, useReducer, useState, useMemo } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect((): void => {
    canvasDispatch({
      type: isZoomCanvas ? 'setZoomCanvasRef' : 'setMainCanvasRef',
      canvasRef: canvasRef,
    });
  }, [canvasRef, canvasDispatch, isZoomCanvas]);

  const [toolState, toolStateDispatch] = useReducer(toolStateReducer, initialToolState);

  console.log('render, isZoomCanvas=' + isZoomCanvas);

  const destinationCanvasRef = isZoomCanvas ? canvasState.mainCanvasRef : canvasState.zoomCanvasRef;
  const destinationCtx = useMemo((): CanvasRenderingContext2D | null => {
    console.log('memo');
    if (destinationCanvasRef === null) {
      return null;
    }
    if (destinationCanvasRef.current === null) {
      return null;
    }
    const destinationCanvas = destinationCanvasRef.current;
    return destinationCanvas.getContext('2d');
  }, [destinationCanvasRef]);

  const [edited, setEdited] = useState(0);
  useEffect((): void => {
    if (!toolbarState.zoomModeOn) {
      return;
    }
    console.log('hook, isZoomCanvas=' + isZoomCanvas);
    if (destinationCtx && canvasRef.current) {
      console.log('hook, isZoomCanvas=' + isZoomCanvas);
      destinationCtx.drawImage(canvasRef.current, 0, 0);
    }
  }, [edited]);

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
          toolStateDispatch
        )
      }
      onMouseMove={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseMove(
          event,
          canvasRef.current,
          setEdited,
          paletteState,
          toolState,
          toolStateDispatch
        )
      }
      onMouseDown={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseDown(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStateDispatch
        )
      }
      onMouseUp={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseUp(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStateDispatch
        )
      }
      onMouseLeave={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseUp(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStateDispatch
        )
      }
      onMouseEnter={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onMouseEnter(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStateDispatch
        )
      }
      onContextMenu={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolbarState.selectedTool.onContextMenu(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStateDispatch
        )
      }
    />
  );
}

export default Canvas;
