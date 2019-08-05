import React, { useRef, useEffect, useReducer, useState, useMemo } from 'react';
import { CanvasState, CanvasStateAction } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { ToolState, toolStateReducer, Action } from '../../tools/ToolState';
import { ZoomInitialPointSelectorTool } from '../../tools/ZoomInitialPointSelectorTool';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
  canvasState: CanvasState;
  toolbarState: ToolbarState;
  paletteState: PaletteState;
  isZoomCanvas: boolean;
  zoomFactor: number;
}

const initialToolState = new ToolState();

export function Canvas({
  canvasDispatch,
  canvasState,
  toolbarState,
  paletteState,
  isZoomCanvas,
  zoomFactor,
}: Props): JSX.Element {
  console.log('render, isZoomCanvas=' + isZoomCanvas);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect((): void => {
    canvasDispatch({
      type: isZoomCanvas ? 'setZoomCanvasRef' : 'setMainCanvasRef',
      canvasRef: canvasRef,
    });
  }, [canvasRef, canvasDispatch, isZoomCanvas]);

  const destinationCanvasRef = isZoomCanvas ? canvasState.mainCanvasRef : canvasState.zoomCanvasRef;
  const destinationCanvasContext = useDestinationCanvasContext(destinationCanvasRef);

  const [edited, setEdited] = useState(0);
  useSyncToDestinationCanvas(toolbarState, destinationCanvasContext, canvasRef, edited);

  const [toolState, toolStateDispatch] = useReducer(toolStateReducer, initialToolState);

  useEffect((): void => {
    toolStateDispatch({ type: 'setActiveTool', tool: toolbarState.selectedTool });
  }, [toolbarState]);

  useZoomToolInitialSelection(
    isZoomCanvas,
    toolbarState,
    canvasDispatch,
    toolState,
    toolStateDispatch
  );

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
        toolState.activeTool.onClick(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStateDispatch
        )
      }
      onMouseMove={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolState.activeTool.onMouseMove(
          event,
          canvasRef.current,
          setEdited,
          paletteState,
          toolState,
          toolStateDispatch
        )
      }
      onMouseDown={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolState.activeTool.onMouseDown(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStateDispatch
        )
      }
      onMouseUp={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolState.activeTool.onMouseUp(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStateDispatch
        )
      }
      onMouseLeave={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolState.activeTool.onMouseUp(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStateDispatch
        )
      }
      onMouseEnter={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolState.activeTool.onMouseEnter(
          event,
          canvasRef.current,
          paletteState,
          toolState,
          toolStateDispatch
        )
      }
      onContextMenu={(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
        toolState.activeTool.onContextMenu(
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

function useDestinationCanvasContext(
  destinationCanvasRef: React.MutableRefObject<HTMLCanvasElement | null> | null
): CanvasRenderingContext2D | null {
  return useMemo((): CanvasRenderingContext2D | null => {
    if (destinationCanvasRef === null) {
      return null;
    }
    if (destinationCanvasRef.current === null) {
      return null;
    }
    const destinationCanvas = destinationCanvasRef.current;
    return destinationCanvas.getContext('2d');
  }, [destinationCanvasRef]);
}

function useSyncToDestinationCanvas(
  toolbarState: ToolbarState,
  destinationCanvasContext: CanvasRenderingContext2D | null,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  edited: number
): void {
  useEffect((): void => {
    if (!toolbarState.zoomModeOn) {
      return;
    }
    if (destinationCanvasContext && canvasRef.current) {
      destinationCanvasContext.drawImage(canvasRef.current, 0, 0);
    }
  }, [edited]);
}

function useZoomToolInitialSelection(
  isZoomCanvas: boolean,
  toolbarState: ToolbarState,
  canvasDispatch: React.Dispatch<CanvasStateAction>,
  toolState: ToolState,
  toolStateDispatch: React.Dispatch<Action>
): void {
  useEffect((): void => {
    if (isZoomCanvas) {
      return;
    }
    console.log('zoomMode toggled');
    // Temporarily switch selectedTool to zoomInitialPointSelection
    if (toolbarState.zoomModeOn) {
      console.log('zoomMode on');
      toolStateDispatch({ type: 'setActiveTool', tool: new ZoomInitialPointSelectorTool() });
      console.log('tool set');
    } else {
      console.log('zoomMode off');
      canvasDispatch({
        type: 'setZoomFocusPoint',
        point: null,
      });
    }
    console.log('end of useEffect');
  }, [toolbarState.zoomModeOn]);

  useEffect((): void => {
    console.log('zoomInitialPoint changed');
    canvasDispatch({
      type: 'setZoomFocusPoint',
      point: toolState.zoomToolState.zoomInitialPoint,
    });
    toolStateDispatch({ type: 'setActiveTool', tool: toolbarState.selectedTool });
  }, [toolState.zoomToolState.zoomInitialPoint]);
}

export default Canvas;
