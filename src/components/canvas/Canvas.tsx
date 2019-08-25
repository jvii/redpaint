import React, { useEffect, useReducer, useRef } from 'react';
import { CanvasState, CanvasStateAction } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { ToolState, toolStateReducer } from '../../tools/ToolState';
import { useSyncToTargetCanvas, useCanvasRef, useZoomToolInitialSelection } from './hooks';
import { getEventHandler } from '../../tools/util';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
  canvasState: CanvasState;
  toolbarState: ToolbarState;
  paletteState: PaletteState;
  isZoomCanvas: boolean;
  zoomFactor?: number;
}

export function Canvas({
  canvasDispatch,
  canvasState,
  toolbarState,
  paletteState,
  isZoomCanvas,
  zoomFactor = 1,
}: Props): JSX.Element {
  const [toolState, toolStateDispatch] = useReducer(toolStateReducer, new ToolState());
  useEffect((): void => {
    toolStateDispatch({ type: 'setActiveTool', tool: toolbarState.selectedTool });
  }, [toolbarState]);

  const [canvasRef] = useCanvasRef(canvasDispatch, isZoomCanvas);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [setSyncPoint] = useSyncToTargetCanvas(
    isZoomCanvas,
    toolbarState,
    canvasState,
    canvasRef.current
  );

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
    overlayCanvas: overlayCanvasRef.current,
    onDraw: (): void => setSyncPoint(Date.now()),
    paletteState: paletteState,
    toolState: toolState,
    toolStateDispatch: toolStateDispatch,
  };

  return (
    <div className="CanvasContainer">
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
      <canvas
        className="OverlayCanvas Canvas"
        ref={overlayCanvasRef}
        width={canvasState.canvasResolution.width}
        height={canvasState.canvasResolution.height}
        style={CSSZoom}
      />
    </div>
  );
}

export default Canvas;
