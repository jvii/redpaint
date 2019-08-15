import React, { useRef, useEffect, useReducer, useState, useMemo } from 'react';
import { CanvasState, CanvasStateAction } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { ToolState, toolStateReducer, Action } from '../../tools/ToolState';
import { ZoomInitialPointSelectorTool } from '../../tools/ZoomInitialPointSelectorTool';
import './Canvas.css';
import { Tool } from '../../tools/Tool';

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

  const [setSyncPoint] = useSyncToTargetCanvas(isZoomCanvas, toolbarState, canvasState, canvasRef);

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

  const eventHandlerParams = {
    canvas: canvasRef.current,
    setSyncPoint: (): void => setSyncPoint(Date.now()),
    paletteState: paletteState,
    toolState: toolState,
    toolStateDispatch: toolStateDispatch,
  };

  return (
    <canvas
      className="Canvas"
      ref={canvasRef}
      width={canvasState.canvasResolution.width}
      height={canvasState.canvasResolution.height}
      style={CSSZoom}
      onClick={getEventHandler(toolState.activeTool, 'onClick', eventHandlerParams)}
      onMouseMove={getEventHandler(toolState.activeTool, 'onMouseMove', eventHandlerParams)}
      onMouseDown={getEventHandler(toolState.activeTool, 'onMouseDown', eventHandlerParams)}
      onMouseUp={getEventHandler(toolState.activeTool, 'onMouseUp', eventHandlerParams)}
      onMouseLeave={getEventHandler(toolState.activeTool, 'onMouseLeave', eventHandlerParams)}
      onMouseEnter={getEventHandler(toolState.activeTool, 'onMouseEnter', eventHandlerParams)}
      onContextMenu={getEventHandler(toolState.activeTool, 'onContextMenu', eventHandlerParams)}
    />
  );
}

function getEventHandler(
  tool: Tool,
  eventHandlerName: string,
  eventHandlerParamsWithoutEvent: any
): (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => void {
  if (hasKey(tool, eventHandlerName)) {
    return (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
      tool[eventHandlerName]!({ event: event, ...eventHandlerParamsWithoutEvent });
  }
  return (): void => {};
}

function hasKey<O>(obj: O, key: keyof any): key is keyof O {
  return key in obj;
}

function useSyncToTargetCanvas(
  isZoomCanvas: boolean,
  toolbarState: ToolbarState,
  canvasState: CanvasState,
  canvasRef: React.RefObject<HTMLCanvasElement>
): React.Dispatch<React.SetStateAction<number>>[] {
  const [syncPoint, setSyncPoint] = useState(0);
  const syncTargetCanvasRef = isZoomCanvas ? canvasState.mainCanvasRef : canvasState.zoomCanvasRef;
  const syncTargetCanvasContext = useDestinationCanvasContext(syncTargetCanvasRef);
  useEffect((): void => {
    if (!toolbarState.zoomModeOn) {
      return;
    }
    syncToTargetCanvas(syncTargetCanvasContext, canvasRef);
  }, [syncPoint, toolbarState.zoomModeOn]); // sync if syncPoint set or zoomMode activated
  return [setSyncPoint];
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

function syncToTargetCanvas(
  targetCanvasContext: CanvasRenderingContext2D | null,
  sourceCanvasRef: React.RefObject<HTMLCanvasElement>
): void {
  if (targetCanvasContext && sourceCanvasRef.current) {
    targetCanvasContext.drawImage(sourceCanvasRef.current, 0, 0);
  }
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
    // switch active tool to zoomInitialPointSelection for next render cycle
    if (toolbarState.zoomModeOn) {
      toolStateDispatch({ type: 'setActiveTool', tool: new ZoomInitialPointSelectorTool() });
    } else {
      canvasDispatch({
        type: 'setZoomFocusPoint',
        point: null,
      });
    }
  }, [toolbarState.zoomModeOn]);

  useEffect((): void => {
    canvasDispatch({
      type: 'setZoomFocusPoint',
      point: toolState.zoomToolState.zoomInitialPoint,
    });
    toolStateDispatch({ type: 'setActiveTool', tool: toolbarState.selectedTool });
  }, [toolState.zoomToolState.zoomInitialPoint]);
}

export default Canvas;
